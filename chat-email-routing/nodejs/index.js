const platformClient = require('purecloud-platform-client-v2');
const WebSocket = require('websocket').w3cwebsocket;

// Set Genesys Cloud objects
const client = platformClient.ApiClient.instance;
const notificationsApi = new platformClient.NotificationsApi();
const conversationsApi = new platformClient.ConversationsApi();

// Set Genesys Cloud settings
client.setEnvironment('mypurecloud.com');
client.setPersistSettings(true, 'test_app');

// Get client credentials from environment variables
const GENSYS_CLOUD_CLIENT_ID = process.env.GENSYS_CLOUD_CLIENT_ID;
const GENSYS_CLOUD_CLIENT_SECRET = process.env.GENSYS_CLOUD_CLIENT_SECRET;

// Use your own data here
const PROVIDER_NAME = 'Developer Center Tutorial';
const QUEUE_ID = '636f60d4-04d9-4715-9350-7125b9b553db';

// Local vars
let conversationsTopic = null;
let webSocket = null;

// Authenticate with Genesys Cloud
client.loginClientCredentialsGrant(GENSYS_CLOUD_CLIENT_ID, GENSYS_CLOUD_CLIENT_SECRET)
	.then(() => {
		console.log('Authenticated with Genesys Cloud');

		// Create a new notification channel for this app
		return notificationsApi.postNotificationsChannels();
	})
	.then((channel) => {
		// Subscribe to conversation notifications for the queue
		conversationsTopic = 'v2.routing.queues.' + QUEUE_ID + '.conversations.emails';
		notificationsApi.putNotificationsChannelSubscriptions(channel.id, [ { id: conversationsTopic } ])
			.catch((err) => console.log(err));

		// Open a new web socket using the connect Uri of the channel
		webSocket = new WebSocket(channel.connectUri);
		webSocket.onopen = () => {
			// Create a new 3rd party email
			createEmail();
		};

		// Message received callback function
		webSocket.onmessage = (message) => {
			// Parse string message into JSON object
			let data = JSON.parse(message.data);

			// Filter out unwanted messages
			if (data.topicName.toLowerCase() === 'channel.metadata') {
				console.log(`Heartbeat ${new Date()}`);
				return;
			} else if (data.topicName.toLowerCase() !== conversationsTopic.toLowerCase()) {
				console.log(`Unexpected notification: ${JSON.stringify(data)}`);
				return;
			}
			
			// Color text red if it matches this provider
			let providerText = data.eventBody.participants[0].provider;
			if(data.eventBody.participants[0].provider === PROVIDER_NAME) {
				providerText = `\x1b[31m${providerText}\x1b[0m`;	
			}
			
			// Log some info
			console.log(`[${providerText}] id:${data.eventBody.id} from:${data.eventBody.participants[0].name} <${data.eventBody.participants[0].address}>`);
		};
	})
	.catch((err) => console.log(err));

// Creates a 3rd party email
// https://developer.mypurecloud.com/api/rest/v2/conversations/third-party-object-routing.html
function createEmail() {
	let emailData = {
		queueId: QUEUE_ID,
		provider: PROVIDER_NAME,
		toAddress: 'Developer Tutorial',
		toName: 'Developer Tutorial',
		fromAddress: 'no-reply@mypurecloud.com',
		fromName: 'John Doe',
		subject: 'External system email'
	};

	conversationsApi.postConversationsEmails(emailData)
		.then((conversation) => {
			const conversationId = conversation.id;
			console.log(`Created email, conversation id:${conversationId}`);
		})
		.catch((err) => console.log(err));
}
