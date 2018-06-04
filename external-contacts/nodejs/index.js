const platformClient = require('purecloud-platform-client-v2');
const CSV = require('csv-string');
const fs = require('fs');

// Get client credentials from environment variables
const PURECLOUD_CLIENT_ID = process.env.PURECLOUD_CLIENT_ID;
const PURECLOUD_CLIENT_SECRET = process.env.PURECLOUD_CLIENT_SECRET;

// Set purecloud objects
const client = platformClient.ApiClient.instance;
const externalContactsApi = new platformClient.ExternalContactsApi();

// Set PureCloud settings
client.setEnvironment('mypurecloud.com');

// Authenticate with PureCloud
client.loginClientCredentialsGrant(PURECLOUD_CLIENT_ID, PURECLOUD_CLIENT_SECRET)
	.then(() => {
		console.log('Authenticated with PureCloud');

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
				screenName: 'PureCloud_dev'
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
		for (let c = 1; c < contacts.length; c++){
			const userData = contacts[c];
			const user = {
				'firstName': userData[0],
				'lastName': userData[1],
				'title': userData[5],
				'workPhone': {
					'display': userData[6]
				},
				'address': {
					'address1': userData[2],
					'city': userData[3],
					'postalCode': userData[4]
				},
				'workEmail': userData[8],
				'externalOrganization': {
					'id': organization.id
				}
			};

			// Create contact and collect promise
			let contactPromise = externalContactsApi.postContacts(user)
				.then((data) => {console.log(data);console.log(`Added ${userData[0]} ${userData[1]}`);});
			promises.push(contactPromise);
		}

		return Promise.all(promises);
	})
	.then(() => {
		console.log('All contacts added');
	})
	.catch((err) => console.log(err));
