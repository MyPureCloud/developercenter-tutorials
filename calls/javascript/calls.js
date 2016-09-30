var CONVERSATION_LIST_TEMPLATE = null;

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

var clientId = '6cf4b2d8-26ed-4f44-af81-932a8d8b9404';
var redirectUri = 'http://localhost:8080/index.html';

var pureCloudSession = new purecloud.platform.PureCloudSession({
    strategy: 'implicit',
    clientId: clientId,
    redirectUrl: redirectUri,
    environment: 'inindca.com'
});
pureCloudSession.login();

var conversationsApi = new purecloud.platform.ConversationsApi(pureCloudSession);
var interval;
var conversationList = [];

// jQuery calls this when the DOM is available
$(document).ready(function() {
    CONVERSATION_LIST_TEMPLATE =Handlebars.compile($("#entry-template").html());

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
        var body = {
            "phoneNumber":$('input#dialstring').val()
        };

        // Invoke API
        conversationsApi.postCalls(body).then(function(result) {
            // Clear dialstring from text box
            $('input#dialstring').val('');
        }).catch(function(err){
            console.error(err);
        });
    });
});

// Gets current queue contents and displays it
function checkQueue() {
    console.debug("Checking queue...");
    // Invoke API
    conversationsApi.getCalls().then(function(calls) {
        conversationList = calls.entities;
        var html = CONVERSATION_LIST_TEMPLATE(calls.entities);
        $('#call-table').html(html);
    });
}

// Mute participant
function mute(callId, participantId, currentMuteState) {
    // Create request body
    var body = {
        "muted": !currentMuteState
    };

    // Invoke API
    conversationsApi.patchCallsCallIdParticipantsParticipantId(callId, participantId, body).then(function(result) {
        // Result will be empty here
    }).catch(function(err){
        console.error(err);
    });
}

// Hold participant
function hold(callId, participantId, currentHoldState) {
    // Create request body
    var body = {
        "held": !currentHoldState
    };

    // Invoke API
    conversationsApi.patchCallsCallIdParticipantsParticipantId(callId, participantId, body).then(function(result) {
        // Result will be empty here
    }).catch(function(err){
        console.error(err);
    });
}

// Disconnect participant
function disconnect(callId, participantId) {
    // Create request body
    var body = {
        "state": "disconnected"
    };

    // Invoke API
    conversationsApi.patchCallsCallIdParticipantsParticipantId(callId, participantId, body).then(function(result) {
        // Result will be empty here
    }).catch(function(err){
        console.error(err);
    });
}

function startConsult() {
    var callId = conversationList[0].id;

    //grab the first participant which is going to be the party we dialed for an outbound call
    var participantId = conversationList[0].participants[1].id;

    // Create request body
    var body = {
        "speakTo": "destination",
        "destination":{
            "address" : $('input#newparticipant').val()
        }
    };

    // Invoke API
    conversationsApi.postCallsCallIdParticipantsParticipantIdConsult(callId, participantId, body).then(function(result) {
        $('input#newparticipant').val('');
        // We can ignore the response in this tutorial.
    }).catch(function(err){
        console.error(err);
    });
}

function consultSpeakTo(speakTo) {
    var callId = conversationList[0].id;

    //grab the first participant which is going to be the party we dialed for an outbound call
    var participantId = conversationList[0].participants[1].id;

    // Create request body
    var body = {
        "speakTo": speakTo
    };

    // Invoke API
    conversationsApi.patchCallsCallIdParticipantsParticipantIdConsult(callId, participantId, body).then(function(result) {
        // We can ignore the response in this tutorial.
    }).catch(function(err){
        console.error(err);
    });
}
