/* globals Handlebars */

// This client ID expects the redirect URL to be http://localhost:8080/
const clientId = 'babbc081-0761-4f16-8f56-071aa402ebcb';
const redirectUri = window.location.href;

// Set purecloud objects
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;
const conversationsApi = new platformClient.ConversationsApi();
const notificationsApi = new platformClient.NotificationsApi();
const usersApi = new platformClient.UsersApi();

// Set PureCloud settings
client.setEnvironment('mypurecloud.com');
client.setPersistSettings(true, 'test_app');

// Set local vars
let CONVERSATION_LIST_TEMPLATE = null;
let conversationList = {};
let me, webSocket, conversationsTopic, notificationChannel;

// Set up handlebars
Handlebars.registerHelper('unlessCond', (v1, v2, options) => {
	if(v1 !== v2) {
		return options.fn(this);
	}
	return options.inverse(this);
});

Handlebars.registerHelper('isConsult', (participants, options) => {
	if(participants.length > 2) {
		return options.fn(this);
	}
	return options.inverse(this);
});

// jQuery calls this when the DOM is available
$(document).ready(() => {
	// Authenticate with PureCloud
	client.loginImplicitGrant(clientId, redirectUri)
		.then(() => {
			console.log('Logged in');

			// Get authenticated user's info
			return usersApi.getUsersMe();
		})
		.then((userMe) => {
			console.log('userMe: ', userMe);
			me = userMe;

			// Create notification channel
			return notificationsApi.postNotificationsChannels();
		})
		.then((channel) => {
			console.log('channel: ', channel);
			notificationChannel = channel;

			// Set up web socket
			webSocket = new WebSocket(notificationChannel.connectUri);
			webSocket.onmessage = handleNotification;

			// Subscribe to authenticated user's conversations
			conversationsTopic = 'v2.users.' + me.id + '.conversations';
			const body = [ { id: conversationsTopic } ];
			return notificationsApi.putNotificationsChannelSubscriptions(notificationChannel.id, body);
		})
		.then((topicSubscriptions) => {
			console.log('topicSubscriptions: ', topicSubscriptions);

			CONVERSATION_LIST_TEMPLATE = Handlebars.compile($('#entry-template').html());

			// Handle dial button click
			$('button#dial').click(() => {
				// Create request body
				let body = {
					'phoneNumber':$('input#dialstring').val()
				};

				// Invoke API
				conversationsApi.postConversationsCalls(body).then(() => {
					// Clear dialstring from text box
					$('input#dialstring').val('');
				}).catch((err) => console.error(err));
			});
		})
		.catch((err) => console.error(err));
});

// Handle incoming PureCloud notification from WebSocket
function handleNotification(message) {
	// Parse notification string to a JSON object
	const notification = JSON.parse(message.data);

	// Discard unwanted notifications
	if (notification.topicName.toLowerCase() === 'channel.metadata') {
		// Heartbeat
		console.info('Ignoring metadata: ', notification);
		return;
	} else if (notification.topicName.toLowerCase() !== conversationsTopic.toLowerCase()) {
		// Unexpected topic
		console.warn('Unknown notification: ', notification);
		return;
	} else {
		console.debug('Conversation notification: ', notification);
	}

	// See function description for explanation
	copyCallPropsToParticipant(notification.eventBody);

	// Update conversation in list or remove it if disconnected
	if (isConversationDisconnected(notification.eventBody))
		delete conversationList[notification.eventBody.id];
	else
		conversationList[notification.eventBody.id] = notification.eventBody;

	// Update UI
	$('#call-table').html(CONVERSATION_LIST_TEMPLATE(Object.values(conversationList)));
}

/* This function copies properties from the participant's call object in a notification to the 
 * participant object to make the participant object look the same as the response from the 
 * conversations APIs. This isn't strictly necessary, but is helpful to maintain a consistent structure.
 */
function copyCallPropsToParticipant(conversation) {
	conversation.participants.forEach((participant) => {
		if (!participant.calls || participant.calls.length === 0) return;

		participant.ani = participant.calls[0].self.addressNormalized;
		participant.attributes = participant.additionalProperties;
		participant.confined = participant.calls[0].confined;
		participant.direction = participant.calls[0].direction;
		participant.dnis = participant.calls[0].other.addressNormalized;
		participant.held = participant.calls[0].held;
		participant.muted = participant.calls[0].muted;
		participant.provider = participant.calls[0].provider;
		participant.recording = participant.calls[0].recording;
		participant.recordingState = participant.calls[0].recordingState;
		participant.state = participant.calls[0].state;
		if (participant.userId)
			participant.user = { id: participant.userId, selfUri: `/api/v2/users/${participant.userId}` };
		if (participant.calls[0].peerId)
			participant.peer = participant.calls[0].peerId;
	});
}

// Determines if a conversation is disconnected by checking to see if all participants are disconnected
function isConversationDisconnected(conversation) {
	let isConnected = false;
	conversation.participants.some((participant) => {
		if (participant.state !== 'disconnected') {
			isConnected = true;
			return true;
		}
	});

	return !isConnected;
}

// Mute participant
function mute(callId, participantId, currentMuteState) {
	// Create request body, only set desired properties
	let body = {
		'muted': !currentMuteState
	};

	// Invoke API
	conversationsApi.patchConversationsCallParticipant(callId, participantId, body)
		.then(() => {
			// Result will be empty here
		}).catch((err) => console.error(err));
}

// Hold participant
function hold(callId, participantId, currentHoldState) {
	// Create request body, only set desired properties
	let body = {
		'held': !currentHoldState
	};

	// Invoke API
	conversationsApi.patchConversationsCallParticipant(callId, participantId, body)
		.then(() => {
			// Result will be empty here
		}).catch((err) => console.error(err));
}

// Disconnect participant
function disconnect(callId, participantId) {
	// Create request body, only set desired properties
	let body = {
		'state': 'disconnected'
	};

	// Invoke API
	conversationsApi.patchConversationsCallParticipant(callId, participantId, body)
		.then(() => {
			// Result will be empty here
		}).catch((err) => console.error(err));
}

function startConsult() {
	console.debug(conversationList);
	let callId = conversationList[Object.keys(conversationList)[0]].id;

	// Grab the first participant, which should be the party we dialed for an outbound call
	let participantId = conversationList[callId].participants[1].id;

	// Create request body
	let body = {
		'speakTo': 'destination',
		'destination':{
			'address' : $('input#newparticipant').val()
		}
	};

	// Invoke API
	conversationsApi.postConversationsCallParticipantConsult(callId, participantId, body)
		.then(() => {
			$('input#newparticipant').val('');
			// We can ignore the response in this tutorial.
		}).catch((err) => console.error(err));
}

function consultSpeakTo(speakTo) {
	let callId = conversationList[Object.keys(conversationList)[0]].id;

	//grab the first participant, which should be the party we dialed for an outbound call
	let participantId = conversationList[callId].participants[1].id;

	// Create request body
	let body = {
		'speakTo': speakTo
	};

	// Invoke API
	conversationsApi.patchConversationsCallParticipantConsult(callId, participantId, body)
		.then(() => {
			// We can ignore the response in this tutorial.
		}).catch((err) => console.error(err));
}
