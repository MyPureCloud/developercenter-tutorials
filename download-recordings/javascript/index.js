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
    client.loginClientCredentialsGrant(result.clientId, result.clientSecret)
        .then(() => {
            console.log('Working...');
            let body = {
                interval: result.dates
            }; // Object | query

            // Call conversation API, pass date inputted to extract conversationIds needed
            conversationsApi.postAnalyticsConversationsDetailsQuery(body)
                .then((conversationDetails) => {
                    // Pass conversation details to function
                    extractConversationDetails(conversationDetails)    
                    // Create folder that will store all the downloaded recordings
                    fs.mkdirSync('./' + ('Recordings'), function (err) {
                        if (err) {
                            return console.error(err);
                        }
                    });
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
// Format conversation details to object inside and array. Get every mediatype per conversation
function extractConversationDetails (conversationDetails) {
    // Create conversationIds array to store all conversationId
    let conversationIds = [];

    // Push all conversationId from conversationDetails to conversationIds
    for (conversationDetail of conversationDetails.conversations) {
        conversationIds.push(conversationDetail.conversationId);
        let conversationId = conversationIds[conversationIds.length - 1];
        getRecordingMetaData(conversationId);
    }
}

// Generate recordingId for every conversationId
function getRecordingMetaData (conversationId) {
    recordingApi.getConversationRecordingmetadata(conversationId)
        .then((recordingsData) => {
            // Pass recordingsMetadata to a function
            iterateRecordingsData(recordingsData);
        })
        .catch((err) => {
            console.log('There was a failure calling getConversationRecordingmetadata');
            console.error(err);
        });
}

// Iterate through every result, check if there are one or more recordingIds in every conversation
function iterateRecordingsData (recordingsData) {
    for (iterateRecordings of recordingsData) {
        getSpecificRecordings(iterateRecordings)
    }
}
// Plot conversationId and recordingId to request for batchdownload Recordings
function getSpecificRecordings (iterateRecordings) {
    let getSpecificRecordingsbody = {
        batchDownloadRequestList: [{
            conversationId: iterateRecordings.conversationId,
            recordingId: iterateRecordings.id
        }]
    }; // Object | Job submission criteria

    recordingApi.postRecordingBatchrequests(getSpecificRecordingsbody)
        .then((recordingBatchrequestid) => {
            recordingStatus(recordingBatchrequestid);
        })
        .catch((err) => {
            console.log('There was a failure calling postRecordingBatchrequests');
            console.error(err);
        });
}

// Check status of generating url for downloading, if the result is still unavailble. The function will be called again until the result is available.
function recordingStatus (recordingBatchrequestid) {
    recordingApi.getRecordingBatchrequest(recordingBatchrequestid.id)
        .then((getRecordingBatchrequestdata) => {
            if (getRecordingBatchrequestdata.expectedResultCount === getRecordingBatchrequestdata.resultCount) {
                // Pass the getRecordingBatchrequestdata to getExtension function
                getExtension(getRecordingBatchrequestdata);
            } else {
                setTimeout(() => recordingStatus(recordingBatchrequestid), 5000);
            }
        })
        .catch((err) => {
            console.log('There was a failure calling getRecordingBatchrequest');
            console.error(err);
        });
}

// Get extension of every recordings
function getExtension (getRecordingBatchrequestdata) {
    // Store the contenttype to a variable that will be used later to determine the extension of recordings.
    let contentType = getRecordingBatchrequestdata.results[0].contentType;
    // Slice the text and gets the extension that will be used for the recording
    let ext = contentType.split('/').splice(-1);

    createDirectory(ext, getRecordingBatchrequestdata);
}

// Generate directory for recordings that will be downloaded
function createDirectory (ext, getRecordingBatchrequestdata) {
    console.log('Processing please wait...');

    let conversationId = getRecordingBatchrequestdata.results[0].conversationId;
    let recordingId = getRecordingBatchrequestdata.results[0].recordingId;
    let url = getRecordingBatchrequestdata.results[0].resultUrl;

    fs.mkdirSync('./Recordings/' + (conversationId + '_' + recordingId), function (err) {
        if (err) {
            return console.error(err);
        }
    });

    downloadRecording(conversationId, recordingId, url, ext);
}
// Download recordings
function downloadRecording (conversationId, recordingId, url, ext) {
    const downloadFile = conversationId + '_' + recordingId + '.' + ext;
    const file = fs.createWriteStream(('./Recordings/' + conversationId + '_' + recordingId + '/' + downloadFile));
    http.get(url, function (response) {
        response.pipe(file);
    });
}
