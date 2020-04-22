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
let chatConversations = []; // Chat conversations handled by the user
let activeChatId = ''; // Chat that is in focus on the UI
let activeCommunicationId = '';
let channel = {};

// Contains the calback functions for the subscribed topics 
// in the notifications channel.
// <topic name>:<callback function>
let topicCallbackMap = {
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
            let conversation = chatConversations.find(c => c.id == convId);
            let participant = conversation.participants.find(p => p.chats[0].id == senderId);
            let name = participant.name;
            let purpose = participant.purpose;

            view.addChatMessage(name, message, convId, purpose);

            // Get agent communication ID
            if(purpose == 'agent') {
                stackedText = '';
            } 
            // Get some recommended replies
            if(purpose == 'customer'){
                stackedText += message;
                showRecommendations(stackedText);
            }

            break;
    }
};

/**
 * Set the focus to the specified chat conversation.
 * @param {String} conversationId conversation id of the new active chat
 */
function setActiveChat(conversationId){
    let conversation = chatConversations.find(c => c.id == conversationId);

    // Store global references to the current chat conversation
    activeChatId = conversationId;
    activeCommunicationId = conversation.participants.slice().reverse()
                                    .find(p => p.purpose == 'agent').chats[0].id;

    return conversationsApi.getConversationsChatMessages(conversationId)
    .then((data) => {
        // Get messages and display to page
        view.makeTabActive(conversationId);
        view.displayTranscript(data.entities, conversation);

        // Rebuild the stacked text string
        stackedText = '';
        let messages = data.entities;
        messages.forEach((msg) => {
            if(msg.hasOwnProperty("body")) {
                let message = msg.body;

                let senderId = msg.sender.id;
                let purpose = conversation
                            .participants.find(p => p.chats[0].id == senderId)
                            .purpose;
                
                if(purpose == 'customer'){
                    stackedText += message;
                }else{
                    stackedText = '';
                }
            }
        });

        // Show recommendations
        showRecommendations(stackedText);
    });
}

/**
 * Agent assistant to get recommended response
 * @param {String} text Chat message
 */
function showRecommendations(text){
    console.log(text);

    // Unoptimized because it's reanalyzing a growing amount of text as long as
    // customer is uninterrupted. But good enough for the sample.
    let recommendations = assistService.getRecommendations(stackedText);
    console.log(recommendations);

    view.showRecommendations(
        recommendations, activeChatId, activeCommunicationId, sendMessage);
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
 * Should be called when there's a new conversation. 
 * Will store the conversations in a global array.
 * @param {String} conversationId PureCloud conversationId
 */
function registerConversation(conversationId){
    return conversationsApi.getConversation(conversationId)
        .then((data) => chatConversations.push(data));
}

/**
 * Get already existing chat conversations, subscribe the conversations to the 
 * notifications and display each name on the tab menu
 * @returns {Promise} 
 */
function processExistingChats(){
    return conversationsApi.getConversationsChats()
    .then((data) => {
        let promiseArr = [];

        data.entities.forEach((conv) => {
            promiseArr.push(registerConversation(conv.id));

            addSubscription(
                `v2.conversations.chats.${conv.id}.messages`,
                onMessage);
        });

        view.populateActiveChatList(data.entities, setActiveChat);


        return Promise.all(promiseArr);
    })
    .then(() => {
        // Set the first one as the active one
        if(chatConversations.length > 0){
            setActiveChat(chatConversations[0].id);
        }
    })
}

/**--------------------------------------------------------
 *                NOTIFICATIONS SECTION
 * ---------------------------------------------------------
 */

/**
 * Create the channel. If called multiple times,
 * the last one will be the active one.
 */
function createChannel(){
    return notificationsApi.postNotificationsChannels()
    .then(data => {
        console.log('---- Created Notifications Channel ----');
        console.log(data);

        channel = data;
        let ws = new WebSocket(channel.connectUri);
        ws.onmessage = () => {
            let data = JSON.parse(event.data);

            topicCallbackMap[data.topicName](data);
        };
    });
}

/**
 * Set-up the channel for chat conversations
 */
function setupChatChannel(){
    return createChannel()
    .then(data => {
        // Subscribe to incoming chat conversations
        return addSubscription(
            `v2.users.${userId}.conversations.chats`, onChatConversationEvent)
    });
}

/**
 * Calback function to when a chat conversation event occurs 
 * for the current user
 * @param {Object} event The Genesys Cloud event
 */
function onChatConversationEvent(event){
    let conversation = event.eventBody;
    let participants = conversation.participants;
    let conversationId = conversation.id;

    console.log(conversation);

    // Get the last agent participant. This happense when a conversation
    // has multiple agent participants, we need to get the latest one.
    let agentParticipant = participants.slice().reverse().find(
        p => p.purpose == 'agent');
    let customerParticipant = participants.find(
        p => p.purpose == 'customer');
    // Value to determine if conversation is already taken into account before
    let isExisting = chatConversations.map((conv) => conv.id)
                        .indexOf(conversationId) != -1;

    // Once agent is connected subscribe to the conversation's messages 
    if(agentParticipant.state == 'connected' && 
            customerParticipant.state == 'connected' && 
            !isExisting){
        // Add conversationid to existing conversations array
        return registerConversation(conversation.id)
        .then(() => {
            // Add conversation to tab
            let participant = conversation.participants.filter(
                participant => participant.purpose === "customer")[0];
            view.addCustomerList(participant.name, conversation.id, setActiveChat);

            return addSubscription(
                `v2.conversations.chats.${conversationId}.messages`,
                onMessage);
        })
    }

    // If agent has multiple interactions,
    // open the active conversation based on PureCloud
    if(agentParticipant.state == 'connected' && customerParticipant.state == 'connected' && agentParticipant.held == false){
        setActiveChat(conversationId);
    }

    // If chat has ended remove the tab and the chat conversation
    if(agentParticipant.state == 'disconnected' && isExisting){
        view.removeTab(conversationId);
        chatConversations = chatConversations.filter(c => c.id != conversationId);
        if(chatConversations.length > 0){
            setActiveChat(chatConversations[0].id);
        }
    }
}

/**
 * Add a subscription to the channel and store the 
 * callback function mapping to the global variable
 * @param {String} topic PureCloud notification topic string
 * @param {Function} callback callback function to fire when the event occurs
 */
function addSubscription(topic, callback){
    let body = [{'id': topic}]

    return notificationsApi.postNotificationsChannelSubscriptions(
            channel.id, body)
    .then((data) => {
        topicCallbackMap[topic] = callback;
        console.log(`Added subscription to ${topic}`);
    });
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
    return processExistingChats();
}).then(data => {
    console.log('Finished Setup');

// Error Handling
}).catch(e => console.log(e));
