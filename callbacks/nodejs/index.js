const platformClient = require('purecloud-platform-client-v2');

// Set Genesys Cloud objects
const client = platformClient.ApiClient.instance;
const conversationsApi = new platformClient.ConversationsApi();

// Get client credentials from environment variables
const CLIENT_ID = process.env.GENESYS_CLOUD_CLIENT_ID;
const CLIENT_SECRET = process.env.GENESYS_CLOUD_CLIENT_SECRET;
const ORG_REGION = process.env.GENESYS_CLOUD_REGION; // eg. us_east_1

// Set environment
const environment = platformClient.PureCloudRegionHosts[ORG_REGION];
if(environment) client.setEnvironment(environment);

// Authenticate with Genesys Cloud
client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
	.then(() => {
		console.log('Logged in');

		// Use your own IDs and data here
		const callbackData = {
			routingData: {
				queueId: 'd1558db4-df3f-4471-9467-1106a55fd6a7'
			},
			scriptId: '29d5d6a0-6199-11e7-8dfd-3b02f841a302',
			callbackUserName: 'Tutorial Callback',
			callbackNumbers: [
				'3172222222'
			],
			data:{
				customDataAttribute: 'custom value'
			},
			callerId: '+13175555555',
			callerIdName: 'John Doe'
		};

		// Create callback
		return conversationsApi.postConversationsCallbacks(callbackData);
	})
	.then((res) => {
		console.log('callback created: ', res);
	})
	.catch((err) => console.error(err));
