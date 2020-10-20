// Import built in libraries needed.
const fs = require('fs');
const csv = require('fast-csv');

// Set Genesys Cloud objects
const platformClient = require('purecloud-platform-client-v2');
const apiClient = platformClient.ApiClient.instance;
// API Instances that will be used to fetch external contacts, organizations, notes and relationships from Genesys Cloud
const contactsApi = new platformClient.ExternalContactsApi();

// OAuth Client Grant Credentials
const apiClientId = '-- id here --';
const apiClientSecret = '-- secret here --';
const apiClientRegion = '-- genesys cloud region here - ex: mypurecloud.com --';

// Script Sample Settings
// - Maximum number of records we will request per "page" when using the External Contacts Scan API endpoints (10 to 200)
const maxRecordsPerPage = 100;
// - Force the script to make a pause between 2 consecutive API requests (to control/prevent API Rate limit)
// i.e. Minimum time between 2 API requests
const minAPIRequestInterval = 500;
// i.e. If there is a pause to make (processing time < minAPIRequestInterval), the pause will be at minimum minWaitTime
const minWaitTime = 50;
// - Define a maximum number of retries (for API Rate Limit rejects)
const maxRateLimitRetryAttempts = 2;
// - Settings for Export to file (CSV or RAW)
const fieldSeparator = ',';
const exportType = 'CSV';

// Global vars
var writeStream, csvStream;
var consecutiveRateLimitRetryAttempts = 0;

/*
------------------------------------------------------------------------------
* Login, Scan Objects
------------------------------------------------------------------------------
*/

//#region Login, Scan

// Login using Client Credentials Grant (returns: true (success), false (failure))
const login = async () => {

    try {
        apiClient.setEnvironment(apiClientRegion);

        let creds = await apiClient.loginClientCredentialsGrant(apiClientId, apiClientSecret);

        console.log('Login Success. Token will expire at: ', creds.tokenExpiryTime);

        return true;
    }
    catch (error) {
        console.error('Login error - Error:', JSON.stringify(error, null, 2));

        return false;
    }
}

// Perform an External Contacts Scan API request and manage errors (429)
const scanContacts = async (cursor) => {

    // Defining the default values for the result structure
    let result = {
        error: false,
        errorMsg: "",
        entities: [],
        isEmpty: true,
        isFinished: true,
        nextCursor: null,
        startTime: 0
    };

    try {
        result.startTime = Date.now();

        let opts = {
            'limit': maxRecordsPerPage
        };
        // No opts.cursor on first scan - cursor == null
        if (cursor) {
            opts.cursor = cursor;
        }

        // External Contacts Scan API request
        let scanData = await contactsApi.getExternalcontactsScanContacts(opts);
        // If the request is successful, we analyze the response

        // The response may contain an empty "entities" array in certain conditions (congestion on database, contacts deleted before the request was performed, ...)
        if (scanData.entities && scanData.entities.length > 0) {
            result.isEmpty = false;
            result.entities = scanData.entities;
        }

        // If the response contains an "after" attribute inside "cursors" (cursors.after), then, there are still some External Contacts (data) to retrieve
        // When the response does not contain an "after" attribute inside "cursors", it means it is the last page of scan
        if (scanData.hasOwnProperty("cursors") && scanData.cursors.hasOwnProperty("after")) {
            result.isFinished = false;
            result.nextCursor = scanData.cursors.after;
        }

        // Reset of some global vars - counters for retry
        consecutiveRateLimitRetryAttempts = 0;

        return result;
    }
    catch (error) {
        console.log('External Contacts Scan error - Error:', JSON.stringify(error, null, 2));

        if (error.status && error.status === 429) {
            // API Rate Limit - Max number of API requests per minute reached
            // Exit Application if too many consecutive retry failures
            if (consecutiveRateLimitRetryAttempts >= maxRateLimitRetryAttempts) {
                result.errorMsg = "Max consecutive API Rate Limit. Exiting...";
                result.error = true;
                return result;
            } else {
                // Extract retry-after header value (seconds) from the 429 error
                let retryAfter = 0;
                if (error.headers && error.headers.hasOwnProperty("retry-after")) {
                    retryAfter = parseInt(error.headers["retry-after"]);
                } else {
                    result.errorMsg = "Failed to retrieve Retry-After. Exiting...";
                    result.error = true;
                    return result;
                }
                // Add 1 second (for "safety")
                let retryIn = (retryAfter + 1) * 1000;
                // Pause execution
                await new Promise((resolve, reject) => setTimeout(resolve, retryIn));

                consecutiveRateLimitRetryAttempts++;

                // Try to request the same data again (current value of cursor)
                let retryScanData = await scanContacts(cursor);
                return retryScanData;
            }
        }
        else {
            // 400 Bad Request - ex: cursor invalid/expired
            // 401 Unauthorized - ex: Invalid token, Token expired
            // and other errors
            result.errorMsg = "Unexpected Error. Exiting...";
            result.error = true;
            return result;
        }
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

    // Login
    let isLoggedIn = await login();

    if (isLoggedIn == false) {
        console.error('Login Failure. Stopping Application...');
        return;
    }

    try {
        console.log("Starting export of External Contacts at: " + new Date(Date.now()).toISOString());

        // Open write stream for file output
        let output_filename;
        let firstWrite = true;

        if (exportType === 'CSV') {
            console.log("Export to CSV");
            output_filename = "GenesysCloud_ExternalContacts_Export_" + (Date.now()).toString() + ".csv";
            // We will export to a csv format - so we will need a first line with the column/header names we want to export
            csvStream = csv.format({ headers: ['id', 'modifyDate', 'firstName', 'lastName', 'workPhone', 'workEmail', 'externalOrganizationId', 'surveyOptOut'], delimiter: fieldSeparator });
            writeStream = fs.createWriteStream(output_filename);
            csvStream.pipe(writeStream);
        } else {
            console.log("Export to Raw JSON");
            output_filename = "GenesysCloud_ExternalContacts_Export_" + (Date.now()).toString() + ".json";
            // We will export to a raw json format (JSON Array) - so we will need to open the JSON array
            let headerString = "[";
            writeStream = fs.createWriteStream(output_filename);
            writeStream.write(headerString);
        }

        // Starting API scan of External Contacts
        let isCompleted = false;
        // First scan - cursor = null
        let currentCursor = null;

        while (isCompleted === false) {
            console.log("Scan External Contacts - cursor: ", currentCursor);
            let scanResult = await scanContacts(currentCursor);

            if (scanResult.error === false) {
                if (scanResult.isEmpty === false) {
                    // Process current data (filter, transform, write)
                    // Note: filter - You can implement a filter condition here and decide if the entity is to be printed (proceed) or not (return)
                    // Note: transform - You can manipulate the entity attributes to create the desired string to be printed

                    if (exportType === 'CSV') {
                        // CSV
                        if (writeStream && csvStream) {
                            for (let entity of scanResult.entities) {
                                // For each entity element, print a line (CSV)
                                let csvrow = [(entity.id ? entity.id : ''), (entity.modifyDate ? entity.modifyDate : ''), (entity.firstName ? entity.firstName : ''), (entity.lastName ? entity.lastName : ''), (entity.workPhone ? entity.workPhone.e164 : ''), (entity.workEmail ? entity.workEmail : ''), (entity.externalOrganization ? entity.externalOrganization.id : ''), (entity.surveyOptOut ? entity.surveyOptOut.toString() : 'false')];
                                csvStream.write(csvrow);
                            }
                        }
                    } else {
                        // RAW JSON
                        if (writeStream) {
                            let entitiesString;
                            if (firstWrite) {
                                firstWrite = false;
                                // The entities array is converted to a string, removing first and last character ([ and ])
                                entitiesString = JSON.stringify(scanResult.entities).slice(1, -1);
                            } else {
                                // If some entities have already been printed before, it is necessary to add a "," separator between printed data and new data to print
                                entitiesString = "," + JSON.stringify(scanResult.entities).slice(1, -1);
                            }

                            writeStream.write(entitiesString);
                        }
                    }
                }

                let elapsedTime = Date.now() - scanResult.startTime;
                console.log("Execution of scan - Start At: " + (scanResult.startTime).toString() + " - Duration: " + elapsedTime.toString() + " ms");

                if (scanResult.isFinished === true) {
                    // Last Data was received (no nextCursor) and export is finished
                    isCompleted = true;
                } else {
                    // Force a pause before next scan (to avoid loading org/token unnecessarily - API rate limit)
                    let forcedDelay;
                    if (elapsedTime < minAPIRequestInterval) {
                        forcedDelay = minAPIRequestInterval - elapsedTime;
                        // For safety - under 50 - set 50ms
                        if (forcedDelay < minWaitTime) {
                            forcedDelay = minWaitTime;
                        }

                        await new Promise((resolve, reject) => setTimeout(resolve, forcedDelay));
                    }

                    // currentCursor variable is updated with the received next cursor
                    currentCursor = scanResult.nextCursor;
                }
            } else {
                // Error - we interrupt application
                isCompleted = true;
                isInterrupted = true;
                console.error("Export of External Contacts has been interrupted - Reason: ", scanResult.errorMsg);
            }
        }

        // Write Footer for Contacts (if necessary) and close stream
        if (exportType === 'CSV') {
            // CSV - No footer to write when exporting to a csv file
            if (csvStream) {
                csvStream.end();
            }
            if (writeStream) {
                writeStream.end();
            }
        } else {
            // RAW JSON - Footer to close the JSON array
            let footerString = "]";
            if (writeStream) {
                writeStream.write(footerString);
                writeStream.end();
            }
        }

        console.log("Finishing export of External Contacts at: " + new Date(Date.now()).toISOString());

    }
    catch (error) {
        // Error - We interrupt application's processing
        console.error("Unexpected error during export of External Contacts. Interrupting application - Error: ", error);
    }

})();

