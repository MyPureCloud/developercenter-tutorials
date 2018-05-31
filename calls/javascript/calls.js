/* globals Handlebars */

// This client ID expects the redirect URL to be http://localhost:8080/
const clientId = 'babbc081-0761-4f16-8f56-071aa402ebcb';
const redirectUri = window.location.href;

// Set purecloud objects
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;
const conversationsApi = new platformClient.ConversationsApi();

// Set PureCloud settings
client.setEnvironment('mypurecloud.com');
client.setPersistSettings(true, 'test_app');

// Set local vars
let CONVERSATION_LIST_TEMPLATE = null;
let interval;
let conversationList = [];

// Set up handlebars
Handlebars.registerHelper('unlessCond', function(v1, v2, options) {
	if(v1 !== v2) {
		return options.fn(this);
	}
	return options.inverse(this);
});

Handlebars.registerHelper('isConsult', function(participants, options) {
	if(participants.length > 2) {
		return options.fn(this);
	}
	return options.inverse(this);
});

// jQuery calls this when the DOM is available
$(document).ready(function() {
	client.loginImplicitGrant(clientId, redirectUri)
		.then(() => {
			console.log('Logged in');
			CONVERSATION_LIST_TEMPLATE = Handlebars.compile($('#entry-template').html());

			// Handle the toggle polling button click
			$('button#togglePolling').click(function() {
				if (interval) {
					clearInterval(interval);
					interval = null;
					$('button#togglePolling').text('Start Queue Polling');
				} else {
					interval = setInterval(checkQueue, 1000);
					$('button#togglePolling').text('Stop Queue Polling');
				}
			});

			// Handle dial button click
			$('button#dial').click(function() {
				// Create request body
				let body = {
					'phoneNumber':$('input#dialstring').val()
				};

				// Invoke API
				conversationsApi.postConversationsCalls(body).then(function(result) {
					// Clear dialstring from text box
					$('input#dialstring').val('');
				}).catch(function(err){
					console.error(err);
				});
			});
		})
		.catch((err) => console.error(err));
});

// Gets current queue contents and displays it
function checkQueue() {
	console.debug('Checking queue...');
	// Invoke API
	conversationsApi.getConversationsCalls().then(function(calls) {
		conversationList = calls.entities;
		let html = CONVERSATION_LIST_TEMPLATE(calls.entities);
		$('#call-table').html(html);
	});
}

// Mute participant
function mute(callId, participantId, currentMuteState) {
	// Create request body
	let body = {
		'muted': !currentMuteState
	};

	// Invoke API
	conversationsApi.patchConversationsCallParticipant(callId, participantId, body).then(function(result) {
		// Result will be empty here
	}).catch(function(err){
		console.error(err);
	});
}

// Hold participant
function hold(callId, participantId, currentHoldState) {
	// Create request body
	let body = {
		'held': !currentHoldState
	};

	// Invoke API
	conversationsApi.patchConversationsCallParticipant(callId, participantId, body).then(function(result) {
		// Result will be empty here
	}).catch(function(err){
		console.error(err);
	});
}

// Disconnect participant
function disconnect(callId, participantId) {
	// Create request body
	let body = {
		'state': 'disconnected'
	};

	// Invoke API
	conversationsApi.patchConversationsCallParticipant(callId, participantId, body).then(function(result) {
		// Result will be empty here
	}).catch(function(err){
		console.error(err);
	});
}

function startConsult() {
	let callId = conversationList[0].id;

	//grab the first participant which is going to be the party we dialed for an outbound call
	let participantId = conversationList[0].participants[1].id;

	// Create request body
	let body = {
		'speakTo': 'destination',
		'destination':{
			'address' : $('input#newparticipant').val()
		}
	};

	// Invoke API
	conversationsApi.patchConversationsCallParticipantConsult(callId, participantId, body).then(function(result) {
		$('input#newparticipant').val('');
		// We can ignore the response in this tutorial.
	}).catch(function(err){
		console.error(err);
	});
}

function consultSpeakTo(speakTo) {
	let callId = conversationList[0].id;

	//grab the first participant which is going to be the party we dialed for an outbound call
	let participantId = conversationList[0].participants[1].id;

	// Create request body
	let body = {
		'speakTo': speakTo
	};

	// Invoke API
	conversationsApi.patchConversationsCallParticipantConsult(callId, participantId, body).then(function(result) {
		// We can ignore the response in this tutorial.
	}).catch(function(err){
		console.error(err);
	});
}
