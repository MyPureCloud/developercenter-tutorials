// This handles the Agent Assistant functionality in the client web app
import assistService from './agent-assistant-service.js';
import view from './view.js';

// Obtain a reference to the platformClient object
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;

// API instances
const usersApi = new platformClient.UsersApi();
const conversationsApi = new platformClient.ConversationsApi();
const notificationsApi = new platformClient.NotificationsApi();

let userId = '';
let activeConversations = [];
let communicationId;
let channel = {};
let ws = null;

// Object that will contain the subscription topic as key and the
// callback function as the value
let subscriptionMap = {
    'channel.metadata': () => {
        console.log('Notification heartbeat.');
    }
};

// Messages of the client that are sent in a straight series.
let stackedText = ''; 

/**
 * Callback function for 'message' and 'typing-indicator' events.
 * For this sample, it will merely display the chat message into the page.
 * 
 * @param {Object} data the event data  
 */
let onMessage = (data) => {
    switch(data.metadata.type){
        case 'typing-indicator':
            break;
        case 'message':
            // Values from the event
            let eventBody = data.eventBody;
            let message = eventBody.body;
            let convId = eventBody.conversation.id;
            let senderId = eventBody.sender.id;

            // Conversation values for cross reference
            let conversation = activeConversations.find(c => c.id == convId);
            let participant = conversation.participants.find(p => p.chats[0].id == senderId);
            let name = participant.name;
            let purpose = participant.purpose;

            view.addChatMessage(name, message, convId, purpose);

            // Get agent communication ID
            if(purpose == 'agent') {
                communicationId = senderId;
                stackedText = '';
            } else {
                let agent = conversation.participants.find(p => p.purpose == 'agent');
                communicationId = agent.chats[0].id;
            }

            // Get some recommended replies
            if(purpose == 'customer') getRecommendations(message, convId, communicationId);

            break;
    }
};

/**
 * Should be called when there's a new conversation. 
 * Will store the conversations in a global array.
 * @param {String} conversationId PureCloud conversationId
 */
function registerConversation(conversationId){
    return conversationsApi.getConversation(conversationId)
        .then((data) => activeConversations.push(data));
}

/**
 * Get current active chat conversations, subscribe the conversations to the 
 * notifications and display each name on the tab menu
 * @returns {Promise} 
 */
function processActiveChats(){
    return conversationsApi.getConversationsChats()
    .then((data) => {
        let promiseArr = [];

        data.entities.forEach((conv) => {
            promiseArr.push(registerConversation(conv.id));

            addSubscription(
                `v2.conversations.chats.${conv.id}.messages`,
                onMessage);
        });

        view.populateActiveChatList(data.entities, showChatTranscript);

        return Promise.all(promiseArr);
    })
}

/**
 * Show the chat messages for a conversation
 * @param {String} conversationId 
 * @returns {Promise} 
 */
function showChatTranscript(conversationId){
    let conversation = activeConversations.find(c => c.id == conversationId);

    return conversationsApi.getConversationsChatMessages(conversationId)
    .then((data) => {
        view.displayTranscript(data.entities, conversation);
    });
}

/**
 * Set-up the channel for chat conversations
 */
function setupChatChannel(){
    return createChannel()
    .then(data => {
        return conversationsApi.getConversations()
        .then((conversation) => {
            if(conversation.entities.length > 0) {
                conversation.entities[0].participants.forEach((participant) => {
                    if (participant.purpose == 'agent' && participant.chats[0].provider == 'PureCloud Webchat v2'
                        && (participant.chats[0].state == 'alerting' || participant.chats[0].state == 'connected')) {
                            communicationId = participant.chats[0].id;
                    }
                });
            }            
        });
    })
    .then(data => {
        // Subscribe to incoming chat conversations
        return addSubscription(
            `v2.users.${userId}.conversations.chats`,

            // Called when a chat conversation event fires (connected to agent, etc.)
            (data) => {
                let conversation = data.eventBody;
                let participants = conversation.participants;
                let conversationId = conversation.id;
                let agentParticipant = participants.find(
                    p => p.purpose == 'agent');
                let customerParticipant = participants.find(
                    p => p.purpose == 'customer');
                
                // Value to determine if conversation is already taken into account before
                let isExisting = activeConversations.map((conv) => conv.id)
                                    .indexOf(conversationId) != -1;

                // Once agent is connected subscribe to the conversation's messages 
                if(agentParticipant.state == 'connected' && customerParticipant.state == 'connected' && !isExisting){
                    // Add conversationid to existing conversations array
                    return registerConversation(conversation.id)
                    .then(() => {
                        // Add conversation to tab
                        let participant = data.eventBody.participants.filter(
                            participant => participant.purpose === "customer")[0];
                        view.addCustomerList(participant.name, data.eventBody.id, showChatTranscript);

                        return addSubscription(
                            `v2.conversations.chats.${conversationId}.messages`,
                            onMessage);
                    })
                }

                // If agent has multiple interactions,
                // open the active conversation based on PureCloud
                if(agentParticipant.state == 'connected' && customerParticipant.state == 'connected' && agentParticipant.held == false){
                    showChatTranscript(conversationId);
                    view.makeTabActive(conversationId);
                }

                // If chat has ended remove the tab
                if(agentParticipant.state == 'disconnected' && isExisting){
                    view.removeTab(conversationId);
                    clearRecommendations();
                }
            });
    });
}

/**
 * Creation of the channel. If called multiple times,
 * the last one will be the active one.
 */
function createChannel(){
    return notificationsApi.postNotificationsChannels()
    .then(data => {
        console.log('---- Created Notifications Channel ----');
        console.log(data);

        channel = data;
        ws = new WebSocket(channel.connectUri);
        ws.onmessage = onSocketMessage;
    });
}

/**
 * Add a subscription to the channel
 * @param {String} topic PureCloud notification topic string
 * @param {Function} callback callback function to fire when the event occurs
 */
function addSubscription(topic, callback){
    let body = [{'id': topic}]

    return notificationsApi.postNotificationsChannelSubscriptions(
            channel.id, body)
    .then((data) => {
        subscriptionMap[topic] = callback;
        console.log(`Added subscription to ${topic}`);
    });
}

function onSocketMessage(event){
    let data = JSON.parse(event.data);

    subscriptionMap[data.topicName](data);
}

/**
 * Agent assistant to get recommended response
 * @param {String} text Chat message
 * @param {String} conversationId
 * @param {String} communicationId
 */
function getRecommendations(text, conversationId, communicationId){
    stackedText += text;
    console.log(stackedText);
    // Unoptimized because it's reanalyzing a growing amount of text as long as
    // customer is uninterrupted. But good enough for the sample.
    let recommendations = assistService.analyzeText(stackedText);
    console.log(recommendations);
    showRecommendations(recommendations, conversationId, communicationId);
}

/**
 * Agent assistant to show recommended response
 * @param {Array} suggArr
 * @param {String} conversationId
 * @param {String} communicationId
 */
function showRecommendations(suggArr, conversationId, communicationId){    
    // Clears all the recommended mesages from the page
    clearRecommendations();

    // Display recommended replies in HTML
    for (var i = 0; i < suggArr.length; i++) {
        var suggest = document.createElement("a");
        suggest.innerHTML = suggArr[i];
        suggest.addEventListener('click', function(event) {
            sendMessage(this.innerText, conversationId, communicationId);
        });

        var suggestContainer = document.createElement("div");
        suggestContainer.appendChild(suggest);
        suggestContainer.className = "suggest-container";
        document.getElementById("agent-assist").appendChild(suggestContainer);
    }    
}

/**
 * Agent assistant to send the selected recommended response
 * @param {String} message
 * @param {String} conversationId
 * @param {String} communicationId
 */
function sendMessage(message, conversationId, communicationId){
    conversationsApi.postConversationsChatCommunicationMessages(
        conversationId, communicationId,
        {
            "body": message,
            "bodyType": "standard"
        }
    )
}

/**
 * Agent assistant to clear recommended responses
 * @param {String} message
 * @param {String} conversationId
 * @param {String} communicationId
 */
function clearRecommendations(){
    const suggContents = document.getElementById("agent-assist");
    while (suggContents.firstChild) {
        suggContents.removeChild(suggContents.firstChild);
    }
}

/** --------------------------------------------------------------
 *                       INITIAL SETUP
 * -------------------------------------------------------------- */
client.loginImplicitGrant(
    'e7de8a75-62bb-43eb-9063-38509f8c21af',
    window.location.href)
.then(data => {
    console.log(data);
    
    // Get Details of current User
    return usersApi.getUsersMe();
}).then(userMe => {
    userId = userMe.id;

    // Create the channel for chat notifications
    return setupChatChannel();
}).then(data => { 
    
    // Get current chat conversations
    return processActiveChats();
}).then(data => {
    console.log('Finished Setup');

// Error Handling
}).catch(e => console.log(e));
