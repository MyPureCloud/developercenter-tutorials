const platformClient = require('purecloud-platform-client-v2');
const CSV = require('csv-string');
const fs = require('fs');
const client = platformClient.ApiClient.instance;

// Get client credentials from environment variables
const CLIENT_ID = process.env.GENESYS_CLOUD_CLIENT_ID;
const CLIENT_SECRET = process.env.GENESYS_CLOUD_CLIENT_SECRET;
const ORG_REGION = process.env.GENESYS_CLOUD_REGION; // eg. us_east_1

// Set environment
const environment = platformClient.PureCloudRegionHosts[ORG_REGION];
if(environment) client.setEnvironment(environment);

// Set Genesys Cloud objects
const externalContactsApi = new platformClient.ExternalContactsApi();

// Authenticate with Genesys Cloud
client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
	.then(() => {
		console.log('Authenticated with Genesys Cloud');

		const organization = {
			name: 'Developer Tutorial Company',
			industry: 'Software',
			address: {
				address1: '7601 Interactive Way',
				city: 'Indianapolis',
				state: 'Indiana',
				postalCode: '46278',
				countryCode: 'USA'
			},
			employeeCount: 2000,
			websites: [
				'https://developer.mypurecloud.com'
			],
			twitterId: {
				screenName: 'GenesysCloudDev'
			}
		};

		// Create new external organization
		return externalContactsApi.postExternalcontactsOrganizations(organization);
	})
	.then((organization) => {
		console.log('Created organization '+ organization.id);

		const promises = [];
		const data = fs.readFileSync('contacts.csv', 'utf8');
		const contacts = CSV.parse(data);

		// Create each contact
		console.log('Adding contacts...');
		for (let c = 1; c < contacts.length; c++){
			const contactData = contacts[c];
			const contact = {
				'firstName': contactData[0],
				'lastName': contactData[1],
				'title': contactData[5],
				'workPhone': {
					'display': contactData[6]
				},
				'address': {
					'address1': contactData[2],
					'city': contactData[3],
					'postalCode': contactData[4]
				},
				'workEmail': contactData[8],
				'externalOrganization': {
					'id': organization.id
				}
			};

			// Create contact and collect promise
			let contactPromise = externalContactsApi.postExternalcontactsContacts(contact)
				.then((data) => console.log(`  ${data.firstName} ${data.lastName} (${data.id})`));
			promises.push(contactPromise);
		}

		return Promise.all(promises);
	})
	.then(() => {
		console.log('All contacts added');
	})
	.catch((err) => console.log(err));
