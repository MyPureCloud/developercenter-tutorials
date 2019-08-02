// Import library to use for input in NPM
const prompt = require('prompt');
// Import built in libraries needed.
const http = require('https');
const fs = require('fs');

// Set purecloud objects
const platformClient = require('purecloud-platform-client-v2');
const client = platformClient.ApiClient.instance;
// Import API that will be used to fetch conversations and recording from PureCloud
const conversationsApi = new platformClient.ConversationsApi();
const recordingApi = new platformClient.RecordingApi();

// Start the prompt
prompt.start();
// Input clientId and clientSecret from user
prompt.get(['clientId', 'clientSecret', 'dates'], function (_err, result) {
    // This login automatically sets token
    client.loginClientCredentialsGrant(result.clientId, result.clientSecret)
        .then(() => {
            console.log('Working...');
            const body = {

                interval: result.dates
            }; // Object | query

            // Call conversation API, pass data from
            conversationsApi.postAnalyticsConversationsDetailsQuery(body)
                .then((conversationData) => {
                    // Pass conversation data from API to getMediaType function
                    getMediaType(conversationData);
                })
                .catch((err) => {
                    console.log('There was a failure calling postAnalyticsConversationsDetailsQuery');
                    console.error(err);
                });
        })

        .catch((err) => {
            // Handle failure response
            console.log(err);
        });
});

// Format coversationId and mediaType to an acceptable JSON format that will be used later in downloading the recordings
function getMediaType (conversationData) {
    // Create an array to handle conversation id and media type
    const modifiedMediaType = [];

    for (const conversationMediaType of conversationData.conversations) {
        modifiedMediaType.push({

            conversationId: conversationMediaType.conversationId,
            mediaType: conversationMediaType.participants[0].sessions[0].mediaType

        });
    }

    // Pass conversationData and modifiedMediaType to formatConversationId function and initiate the function.
    formatConversationId(conversationData, modifiedMediaType);
}

// Format conversationId to acceptable json format that will be used later to download request.
function formatConversationId (conversationData, modifiedMediaType) {
    // Create an array that will store each and every conversation ids and add keys.
    const conversationIds = [];

    for (const id of conversationData.conversations) {
        conversationIds.push({
            conversationId: id.conversationId
        });
    }

    // Pass conversationIds and modifiedMediaType objects to downloadRequest function and initiate the function.
    downloadRequest(conversationIds, modifiedMediaType);
}

// Function that will format objects to be acceptable to postRecordingBatchRequest API. Also accepts modifiedMediaType array that will be used later.
function downloadRequest (conversationIds, modifiedMediaType) {
    const download = {
        batchDownloadRequestList: conversationIds
    };

    recordingApi.postRecordingBatchrequests(download)
        .then((job) => {
            // Once the requests are completed. Generated result such as job will be sent to getRecordingBatchRequest together with modifiedMediaType. Also, initate the function.
            getRecordingBatchRequest(job, modifiedMediaType);
        })
        .catch((err) => {
            console.log('There was a failure calling postRecordingBatchrequests');
            console.error(err);
        });
}

// Function that will generate jobId that will be used to request for request of batch recordings.
function getRecordingBatchRequest (job, modifiedMediaType) {
    recordingApi.getRecordingBatchrequest(job.id)
        .then((batchDownloadData) => {
            // Call the function again after 5 seconds up until the result count is equals to expected result
            if (batchDownloadData.expectedResultCount === batchDownloadData.resultCount) {
                filterBatchDownloadData(batchDownloadData, modifiedMediaType);
            } else {
                console.log('Processed: ' + batchDownloadData.resultCount + '/' + batchDownloadData.expectedResultCount);
                setTimeout(() => getRecordingBatchRequest(job, modifiedMediaType), 5000);
            }
        })
        .catch((err) => {
            console.log('There was a failure calling getRecordingBatchrequest');
            console.error(err);
        });
}

// Filter batchdownload data using array mapping.
function filterBatchDownloadData (batchDownloadData, modifiedMediaType) {
    for (result of batchDownloadData.results) {
        console.log(JSON.stringify(result) + 'result');

        const mapping = modifiedMediaType.find((val) => result.conversationId === val.conversationId);

        console.log('mapping ' + JSON.stringify(mapping));

        getExtensionFromMediaType(result, mapping);
    }
}
// Assign extension for every filtered batchdownload data.
function getExtensionFromMediaType (result, mapping) {
    let ext = '';
    if (mapping.mediaType === 'voice') {
        ext = '.wav';
    } else if (mapping.mediaType === 'chat' || mapping.mediaType === 'email') {
        ext = '.txt';
    } else {
        ext = '';
    }

    createDirectory(result, ext);
}
// Generate directory for recordings that will be downloaded
function createDirectory (result, ext) {
    fs.mkdir('./' + (result.conversationId), function (err) {
        if (err) {
            return console.error(err);
        }
    });
    downloadRecording(result, ext);
}
// Download recordings
function downloadRecording (result, ext) {
    console.log('Currently Downloading...');
    const downloadFile = result.conversationId + '_' + ext;
    const file = fs.createWriteStream(('./' + (result.conversationId)) + '/' + downloadFile);
    http.get(result.resultUrl, function (response) {
        response.pipe(file);
    });
    console.log('DONE');
}
