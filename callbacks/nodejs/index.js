var purecloud = require('purecloud_api_sdk_javascript');

var session = purecloud.PureCloudSession({
    strategy: 'client-credentials',
    clientId: process.env.purecloud_client_id,
    clientSecret: process.env.purecloud_secret,
    timeout: 10000,
    environment: 'mypurecloud.com'
});

session.login().then(function() {
    var callbackData = {
        "routingData": {
            "queueId": "6b156afe-b9c1-49b4-82f3-6dfa5409c71c"
        },
        "scriptId": "37c9f4e0-83f4-11e6-8f6e-a53d3e922867",
        "callbackUserName": "Tutorial Callback",
        "callbackNumbers": [
            "3172222222"
        ],
        "data":{
            "customDataAttribute": "custom value"
        }
    }

    var conversationApi = new purecloud.ConversationsApi(session);
    conversationApi.postCallbacks(callbackData).then(function(callbackResponseData) {
        console.log("Callback Created");
        console.log(callbackResponseData);
    })
    .catch(function(error) {
        console.log(error);
    });
});
