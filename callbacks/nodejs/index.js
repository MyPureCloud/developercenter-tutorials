const platformClient = require('purecloud-platform-client-v2');

// Get client ID and secret from environment vars
const GENESYS_CLOUD_CLIENT_ID = process.env.GENESYS_CLOUD_CLIENT_ID;
const GENESYS_CLOUD_CLIENT_SECRET = process.env.GENESYS_CLOUD_CLIENT_SECRET;

// Set Genesys Cloud objects
const client = platformClient.ApiClient.instance;
const conversationsApi = new platformClient.ConversationsApi();

// Set Genesys Cloud settings
client.setEnvironment('mypurecloud.com');
client.setPersistSettings(true, 'test_app');

// Authenticate with Genesys Cloud
client.loginClientCredentialsGrant(GENESYS_CLOUD_CLIENT_ID, GENESYS_CLOUD_CLIENT_SECRET)
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
			}
		};

		// Create callback
		return conversationsApi.postConversationsCallbacks(callbackData);
	})
	.then((res) => {
		console.log('callback created: ', res);
	})
	.catch((err) => console.error(err));
