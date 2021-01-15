const prompt = require('prompt');
const fetch = require('node-fetch');
const platformClient = require('purecloud-platform-client-v2');

// Get client ID and secret from environment vars
const GENESYS_CLOUD_CLIENT_ID = process.env.GENESYS_CLOUD_CLIENT_ID;
const GENESYS_CLOUD_CLIENT_SECRET = process.env.GENESYS_CLOUD_CLIENT_SECRET;

// Set Genesys Cloud objects
const client = platformClient.ApiClient.instance;
const conversationsApi = new platformClient.ConversationsApi();
const speechTextAnalyticsApi = new platformClient.SpeechTextAnalyticsApi();

// Set Genesys Cloud settings
client.setEnvironment('mypurecloud.com');
client.setPersistSettings(true, 'test_app');

// Input Properties
let schema = {
    properties: {
        conversationId: {
            message: 'Conversation ID',
            required: true
        }
    }
};

// Start the prompt
prompt.start();
// OAuth Login
prompt.get(schema, function (_err, result) {
    client.loginClientCredentialsGrant(GENESYS_CLOUD_CLIENT_ID, GENESYS_CLOUD_CLIENT_SECRET)
    .then(() => {
        getConversationDetails(result.conversationId)
    }).catch((err) => {
        // Handle failure response
        console.log(err);
    });
});

function getConversationDetails(conversationId) {
    conversationsApi.getConversation(conversationId)
    .then((conversationDetails) => {
        let customer = conversationDetails.participants.find(p => p.purpose == 'customer');
        let communicationId = customer.calls[0].id;

        getSentimentScore(conversationId);
        getTranscriptUrl(conversationId, communicationId);
    });
}

function getSentimentScore(conversationId) {
    speechTextAnalyticsApi.getSpeechandtextanalyticsConversation(conversationId)
    .then((data) => {
        console.log('Sentiment Score: ' + data.sentimentScore);
    })
}

function getTranscriptUrl(conversationId, communicationId) {
    speechTextAnalyticsApi.getSpeechandtextanalyticsConversationCommunicationTranscripturl(conversationId, communicationId)
    .then((data) => {
        let settings = { method: 'Get' };

        // Fetch the returned JSON object from the S3 URL
        fetch(data.url, settings)
        .then(res => res.json())
        .then((json) => {
            // Display transcript
            for(phrase of json.transcripts[0].phrases) {
                // Identify if Agent or Customer
                let purpose = (phrase.participantPurpose == 'internal') ? 'Agent' : 'Customer';
                console.log(purpose + ': ' + phrase.text);
            }
        });
    })
}
