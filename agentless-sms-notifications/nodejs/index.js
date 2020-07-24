// Set Genesys Cloud objects
const platformClient = require('purecloud-platform-client-v2');
const client = platformClient.ApiClient.instance;

// Instantiate conversation API
let ConversationsApi = new platformClient.ConversationsApi();

// Get client credentials from environment variables
const CLIENT_ID = '-- client id here --';
const CLIENT_SECRET = '-- client secret here --';

// Authenticate with Genesys Cloud
client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
    .then(() => {

        let body = {
            "fromAddress": "+13178723000",
            "toAddress": "+15557655942",
            "toAddressMessengerType": "sms",
            "textBody": "Hello, this is a test notification"
        }
        
        // call conversation API and send message
        ConversationsApi.postConversationsMessagesAgentless(body)
            .then((data) => {
                console.log(`postConversationsMessagesAgentless success! data: 
                ${JSON.stringify(data, null, 2)}`);
            })
            .catch((err) => {
                console.log('There was a failure calling postConversationsMessagesAgentless');
                console.error(err);
            });
    })
    .catch((err) => console.log(err));