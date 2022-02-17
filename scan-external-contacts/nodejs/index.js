// Import needed built in and external libraries.
const fs = require('fs');
const csv = require('fast-csv');
const { retry } = require('@lifeomic/attempt');

// Import Genesys Cloud Platform API library
const platformClient = require('purecloud-platform-client-v2');

// OAuth Client Grant Credentials
// Get client credentials from environment variables
const CLIENT_ID = process.env.GENESYS_CLOUD_CLIENT_ID;
const CLIENT_SECRET = process.env.GENESYS_CLOUD_CLIENT_SECRET;
const ORG_REGION = process.env.GENESYS_CLOUD_REGION; // eg. us_east_1


// Script Sample Settings

// - Maximum number of records we will request per "page" when using the External Contacts Scan API endpoints (min. 10 to max. 200)
const maxRecordsPerPage = 100;

// - Delay to make a pause between 2 consecutive API requests (to control/prevent API Rate limit)
//   0 milliseconds: No initial delay
//   or Delay imposed by API Rate Control (ex: 250 ms)
const delayAPIRateControl = 250;
// - Define a maximum number of retries (for API Rate Limit rejects)
const maxRateLimitRetryAttempts = 2;

// - Settings for Export to file (CSV or RAW)
const fieldSeparator = ',';
const DefaultExportType = 'CSV';
const DefaultOutputFilename = "GenesysCloud_ExternalContacts_Export_001.csv";

/*
------------------------------------------------------------------------------
* Login, Scan, Export
------------------------------------------------------------------------------
*/

//#region Login, Scan, Export

/*
   The login function is going to take the OAuth client id and secret and get an OAuth client credential token.
   The Bearer token will be used for all of the Javascript Platform API calls.
*/
async function login(clientId, clientSecret, clientRegion) {
    const client = platformClient.ApiClient.instance;

    try {
        // Set environment
        const environment = platformClient.PureCloudRegionHosts[clientRegion];
        if(environment) client.setEnvironment(environment);

        return await client.loginClientCredentialsGrant(clientId, clientSecret);
    } catch (e) {
        console.error('Authentication error has occurred.', e);
        return null
    }
};

/*
    The contactsScanPage function will make a call to the ExternalContactsApi getExternalcontactsScanContacts(),
    passing in current cursor, and will get a set (page) of External Contacts in return.
    The function can also impose an initial delay (delay before the first API request is made), which can be used to limit and to control the API rate (so that Platform API Rate limit is not reached).
    The function automatically performs a limited number of retries on API Rate limit errors (Status 429 - maximum 300 requests/minute on the External Contacts Scan API Endpoints).
*/
async function contactsScanPage(scanCursor, initialDelay) {
    const opts = {
        limit: maxRecordsPerPage
    };
    // No opts.cursor on first scan - scanCursor == null
    if (scanCursor) {
        opts.cursor = scanCursor;
    }

    // Instantiate External Contacts API
    const apiInstance = new platformClient.ExternalContactsApi();

    try {
        // lifeomic/attempt request and retry delays logic (initial, fixed, exponential) is overriden by the calculateDelay function
        // On first run, the calculateDelay will return the initial delay (0 if you don't want to control API rate)
        // On HTTP error, the next delay will be retrieved if it is a HTTP 429 response, from the retry-after header (in seconds).
        // For other type of HTTP errors (401, 50x, ...), the script will just exit.

        // initialDelay:
        // - 0 milliseconds: No initial delay
        // - or Initial Delay imposed by API Rate Control
        let nextDelay = initialDelay;

        // lifeomic/attempt - calculating next delay in handleError
        const result = await retry(
            async () => {
                console.log('Scan Request at: ', Date.now());
                return await apiInstance.getExternalcontactsScanContacts(opts);
            }, {
            maxAttempts: maxRateLimitRetryAttempts,
            timeout: 1000,
            async handleError(err, context) {
                if (err.status == 429) {
                    // Managing API Rate Limit error
                    // Compute delay before retry based on retry-after header value (in seconds)
                    if (error.headers && error.headers.hasOwnProperty("retry-after")) {
                        let retryAfter = parseInt(error.headers["retry-after"]);
                        // Add 1 second (retry-after is rounded to seconds) and convert to milliseconds
                        nextDelay = (retryAfter + 1) * 1000;
                    } else {
                        context.abort();
                    }
                } else {
                    // Interrupt application on other errors (401, 50x, ...)
                    context.abort();
                }
            },
            calculateDelay(context, options) {
                return nextDelay;
            }
        });

        return result;
    } catch (e) {
        console.error(`Error while retrieving external contacts for cursor: ${scanCursor}: ${JSON.stringify(e, null, 4)}`);
        return null;
    }
};

/*
  The contactsScanAll function is going to retrieve and to return all of the external contacts within the org.
  Note:  In the code below, I scan over each page using the Scan API returned cursor (scanning using next cursor until the end of data).
  The results are stored and returned as 1 big list.
*/
async function contactsScanAll(apiRateDelay) {
    let contacts = [];

    let currentCursor = null;
    let isLastPage = false;
    let isSuccessful = false;
    do {
        const contactsPage = await contactsScanPage(currentCursor, apiRateDelay);

        if (contactsPage != null) {
            // It is possible that a response contain less entities than requested (even zero) and that the scan should still continue
            if (contactsPage.entities && contactsPage.entities.length > 0) {
                // Clone each entity to keep the data immutable
                contactsPage.entities
                    .forEach((entity) => { contacts.push(JSON.parse(JSON.stringify(entity))); });
            }
            // If there are more entries to scan than returned in the current page, a cursor will be provided in the response (cursors.after).
            // For each response a new cursor will be provided to be used in the next request.
            if (contactsPage.cursors && contactsPage.cursors.hasOwnProperty("after")) {
                currentCursor = contactsPage.cursors.after;
            } else {
                // No cursor - this is the last page of data
                isLastPage = true;
                isSuccessful = true;
            }
        } else {
            // Error during scan - Exit application
            isLastPage = true;
        }
    }
    while (isLastPage === false);

    if (isSuccessful) {
        return contacts;
    }

    return null;
}

/*
  The contactsExportToFile function requests all External Contacts calling the contactsScanAll function,
  and saves this data in a file, as CSV or as raw JSON.
*/
async function contactsExportToFile(filename, filetype) {
    try {
        console.log("Starting export of External Contacts at: " + new Date(Date.now()).toISOString());

        const writeStream = fs.createWriteStream(filename);

        let allContacts = [];
        allContacts = await contactsScanAll(delayAPIRateControl);

        if (allContacts) {
            switch (filetype) {
                case 'CSV':
                    // With CSV, a subset of the contact's attributes are exported to the file
                    let csvStream = csv.format({ headers: ['id', 'modifyDate', 'firstName', 'lastName', 'workPhone', 'workEmail', 'externalOrganizationId', 'surveyOptOut'], delimiter: fieldSeparator });
                    csvStream.pipe(writeStream);
                    allContacts.forEach((entity) => {
                        let csvrow = [(entity.id ? entity.id : ''), (entity.modifyDate ? entity.modifyDate : ''), (entity.firstName ? entity.firstName : ''), (entity.lastName ? entity.lastName : ''), (entity.workPhone ? entity.workPhone.e164 : ''), (entity.workEmail ? entity.workEmail : ''), (entity.externalOrganization ? entity.externalOrganization.id : ''), (entity.surveyOptOut ? entity.surveyOptOut.toString() : 'false')];
                        csvStream.write(csvrow);
                    });
                    csvStream.end();
                    if (writeStream) {
                        writeStream.end();
                    }
                    break;
                default:
                    // Default - Raw JSON Array
                    let entitiesAsString = JSON.stringify(allContacts);
                    writeStream.write(entitiesAsString);
                    writeStream.end();
                    break;
            }

            console.log("Export of External Contacts completed at: " + new Date(Date.now()).toISOString());

        } else {
            console.log("Export of External Contacts has been interrupted - error retrieving data");
        }
    } catch (e) {
        console.error(`Export error has occurred.`, e);
    }
}

//#endregion


/*
------------------------------------------------------------------------------
* Main
------------------------------------------------------------------------------
*/

(async () => {
    if (maxRecordsPerPage < 10 || maxRecordsPerPage > 200) {
        console.error('Parameters Error: maxRecordsPerPage must be between 10 and 200, default is 100...');
        return;
    }

    // Output filename from command arguments (if provided: node index.js myfilename)
    // Otherwise value from global DefaultOutputFilename constant is used
    let outputFilename = DefaultOutputFilename;
    if (process.argv.length > 2) {
        outputFilename = process.argv[2];
    }

    const creds = await login(CLIENT_ID, CLIENT_SECRET, ORG_REGION);

    if (creds) {
        console.log('Login Success. Token will expire on: ', creds.tokenExpiryTimeString);
        await contactsExportToFile(outputFilename, DefaultExportType);
    } else {
        console.log('Login Failure - Stopping Application...');
    }
})();
