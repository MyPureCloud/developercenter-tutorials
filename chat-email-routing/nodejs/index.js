var WebSocket = require('websocket').w3cwebsocket;
var purecloud = require('purecloud_api_sdk_javascript');

const PROVIDER_NAME = "Developer Center Tutorial";
const QUEUE_ID = "6b156afe-b9c1-49b4-82f3-6dfa5409c71c";

var session = purecloud.PureCloudSession({
    strategy: 'client-credentials',
    clientId: process.env.PURECLOUD_CLIENT_ID,
    clientSecret: process.env.PURECLOUD_SECRET,
    timeout: 10000,
    environment: 'mypurecloud.com'
});

var conversationsTopic = null;
var webSocket = null;
var conversationApi = null;

function createEmail(){
    var emailData = {
       "queueId": QUEUE_ID,
       "provider": PROVIDER_NAME,
       "toAddress": "Developer Tutorial",
       "toName": "Developer Tutorial",
       "fromAddress": "e4f980d8-e8a1-11e6-806b-600308a98970",
       "fromName": "John Doe",
       "subject": "External system email"
    };

    conversationApi = new purecloud.ConversationsApi(session);
    conversationApi.postEmails(emailData).then(function(conversation){
        var conversationId = conversation.id;
        console.log("Created email " + conversationId);
    })
    .catch(function(error) {
        console.error(error);
    });
}

session.login().then(function() {
    var notificationsapi = new purecloud.NotificationsApi(session);
    notificationsapi.postChannels().then(function(data){
       // Start a new web socket using the connect Uri of the channel
       webSocket = new WebSocket(data.connectUri);
       webSocket.onopen = function(){
           // Now that the connection is open, we can start our subscriptions.
           conversationsTopic = 'v2.routing.queues.' + QUEUE_ID + '.conversations';
           notificationsapi.postChannelsChannelIdSubscriptions(data.id, [
               {
                   "id": conversationsTopic
               }]);

           createEmail();
       };

       // Message received callback function
       webSocket.onmessage = function(message) {
           // Parse string message into JSON object
           var data = JSON.parse(message.data);

           if (data.topicName === conversationsTopic) {
                conversationApi.getEmailsEmailId(data.eventBody.id).then(function(emailData){
                    if(emailData.participants[0].provider === PROVIDER_NAME){
                        console.log("Email matches provider");
                        //do something with the email
                    }
                });
           }

       };
   }).catch((err) => console.error(err));

}).catch((err)=>{
    console.error("ERROR Logging in");
    console.error(err);
});

(function wait () {
   setTimeout(wait, 1000);
})();
