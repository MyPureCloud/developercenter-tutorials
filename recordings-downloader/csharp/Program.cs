using System;
using System.IO;
using System.Net;
using System.Reflection;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Diagnostics;
using PureCloudPlatform.Client.V2.Api;
using PureCloudPlatform.Client.V2.Client;
using PureCloudPlatform.Client.V2.Extensions;
using PureCloudPlatform.Client.V2.Extensions.Notifications;
using PureCloudPlatform.Client.V2.Model;
using Newtonsoft.Json;

namespace Recordings
{
    class Program
    {
        static void Main(string[] args)
        {
            // OAuth input
            Console.Write("Enter Client ID: ");
            string clientId = Console.ReadLine();
            Console.Write("Enter Client Secret: ");
            string clientSecret = Console.ReadLine();

            // Get the Date Interval
            Console.Write("Enter Date Interval (YYYY-MM-DDThh:mm:ss/YYYY-MM-DDThh:mm:ss): ");
            string interval = Console.ReadLine();

            Console.WriteLine("Working...");

            // Configure SDK Settings
            string accessToken = GetToken(clientId, clientSecret);
            PureCloudPlatform.Client.V2.Client.Configuration.Default.AccessToken = accessToken;

            // Instantiate APIs
            ConversationsApi conversationsApi = new ConversationsApi();

            // Create folder that will store all the downloaded recordings
            string path = System.IO.Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            path = path.Substring(0, path.LastIndexOf("bin"));
            System.IO.Directory.CreateDirectory(path + "\\Recordings");

            // Call conversation API, pass date inputted to extract conversationIds needed
            AnalyticsConversationQueryResponse conversationDetails = conversationsApi.PostAnalyticsConversationsDetailsQuery(new ConversationQuery(Interval: interval));
            // Pass conversation details to function
            extractConversationDetails(conversationDetails);

            // Final Output
            Console.WriteLine("DONE");

            if (Debugger.IsAttached)
            {
                Console.ReadKey();
            }
        }

        /// <summary>
        /// Format conversation details to object inside and array. Get every mediatype per conversation
        /// </summary>
        /// <param name="conversationDetails"></param>
        /// <returns></returns>
        private static void extractConversationDetails(AnalyticsConversationQueryResponse conversationDetails)
        {
            // Push all conversationId from conversationDetails to conversationIds
            foreach (var conversationDetail in conversationDetails.Conversations)
            {
                getRecordingMetaData(conversationDetail.ConversationId);
            }
        }

        /// <summary>
        /// Generate recordingId for every conversationId
        /// </summary>
        /// <param name="conversationId"></param>
        /// <returns></returns>
        private static void getRecordingMetaData(string conversationId)
        {
            RecordingApi recordingApi = new RecordingApi();
            List<Recording> recordingsData = recordingApi.GetConversationRecordingmetadata(conversationId);

            // Pass recordingsMetadata to a function
            iterateRecordingsData(recordingsData);
        }

        /// <summary>
        /// Iterate through every result, check if there are one or more recordingIds in every conversation
        /// </summary>
        /// <param name="recordingsData"></param>
        /// <returns></returns>
        private static void iterateRecordingsData(List<Recording> recordingsData)
        {
            foreach (var iterateRecordings in recordingsData)
            {
                getSpecificRecordings(iterateRecordings);
            }
        }

        /// <summary>
        /// Plot conversationId and recordingId to request for batchDownload Recordings
        /// </summary>
        /// <param name="iterateRecordings"></param>
        /// <returns></returns>
        private static void getSpecificRecordings(Recording iterateRecordings)
        {
            List<BatchDownloadRequest> batchRequest = new List<BatchDownloadRequest>();            
            BatchDownloadRequest batchDownloadRequest = new BatchDownloadRequest(ConversationId: iterateRecordings.ConversationId, RecordingId: iterateRecordings.Id);
            batchRequest.Add(batchDownloadRequest);
            
            // Create the batch job with the request list
            BatchDownloadJobSubmission batchSubmission = new BatchDownloadJobSubmission(BatchDownloadRequestList: batchRequest);

            BatchDownloadJobSubmissionResult recordingBatchRequestId = new BatchDownloadJobSubmissionResult();
            RecordingApi recordingApi = new RecordingApi();
            recordingBatchRequestId = recordingApi.PostRecordingBatchrequests(batchSubmission);

            recordingStatus(recordingBatchRequestId);
        }

        /// <summary>
        /// Check status of generating url for downloading, if the result is still unavailble. The function will be called again until the result is available.
        /// </summary>
        /// <param name="recordingBatchRequestId"></param>
        /// <returns></returns>
        private static void recordingStatus(BatchDownloadJobSubmissionResult recordingBatchRequestId)
        {
            BatchDownloadJobStatusResult getRecordingBatchRequestData = new BatchDownloadJobStatusResult();
            RecordingApi recordingApi = new RecordingApi();
            getRecordingBatchRequestData = recordingApi.GetRecordingBatchrequest(recordingBatchRequestId.Id);

            if (getRecordingBatchRequestData.ExpectedResultCount == getRecordingBatchRequestData.ResultCount)
            {
                // Pass the getRecordingBatchRequestData to getExtension function
                getExtension(getRecordingBatchRequestData);
            }
            else
            {
                Thread.Sleep(5000);
                recordingStatus(recordingBatchRequestId);
            }
        }

        /// <summary>
        /// Get extension of every recordings
        /// </summary>
        /// <param name="getRecordingBatchRequestData"></param>
        /// <returns></returns>
        private static void getExtension(BatchDownloadJobStatusResult getRecordingBatchRequestData)
        {
            // Store the contentType to a variable that will be used later to determine the extension of recordings.
            string contentType = getRecordingBatchRequestData.Results[0].ContentType;
            // Split the text and gets the extension that will be used for the recording
            string ext = contentType.Split('/').Last();

            createDirectory(ext, getRecordingBatchRequestData);
        }

        /// <summary>
        /// Generate directory for recordings that will be downloaded
        /// </summary>
        /// <param name="ext"></param>
        /// <param name="getRecordingBatchRequestData"></param>
        /// <returns></returns>
        private static void createDirectory(string ext, BatchDownloadJobStatusResult getRecordingBatchRequestData)
        {
            Console.WriteLine("Processing please wait...");

            string conversationId = getRecordingBatchRequestData.Results[0].ConversationId;
            string recordingId = getRecordingBatchRequestData.Results[0].RecordingId;
            string url = getRecordingBatchRequestData.Results[0].ResultUrl;

            string path = System.IO.Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            path = path.Substring(0, path.LastIndexOf("bin"));
            System.IO.Directory.CreateDirectory(path + "\\Recordings\\" + conversationId + "_" + recordingId);

            downloadRecording(url, ext, path + "\\Recordings\\" + conversationId + "_" + recordingId);
        }

        /// <summary>
        /// Download recordings
        /// </summary>
        /// <param name="url"></param>
        /// <param name="ext"></param>
        /// <param name="targetDirectory"></param>
        /// <returns></returns>
        private static void downloadRecording(string url, string ext, string targetDirectory)
        {
            // string downloadFile = conversationId + '_' + recordingId + '.' + ext;
            string filename = targetDirectory.Substring(targetDirectory.LastIndexOf('\\') + 1, 73);

            using (WebClient wc = new WebClient())
                wc.DownloadFile(url, targetDirectory + "\\" + filename + "." + ext);
        }
        
        /// <summary>
        /// Request client credentials token from PureCloud
        /// </summary>
        /// <param name="clientId"></param>
        /// <param name="clientSecret"></param>
        /// <returns></returns>
        private static string GetToken(string clientId, string clientSecret)
        {
            var accessTokenInfo = Configuration.Default.ApiClient.PostToken(clientId, clientSecret);
            string token = accessTokenInfo.AccessToken;

            return token;
        }
    }
}
