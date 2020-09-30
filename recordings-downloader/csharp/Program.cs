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
using PureCloudPlatform.Client.V2.Model;
using Newtonsoft.Json;

namespace Recordings
{
    class Program
    {
        private static ConversationsApi conversationsApi;
        private static RecordingApi recordingApi;
        private static ApiClient apiClient;
        private static String clientId;
        private static String clientSecret;
        private static String dates;
        private static BatchDownloadJobSubmission batchRequestBody = new BatchDownloadJobSubmission();
        private static List<BatchDownloadRequest> batchDownloadRequestList = new List<BatchDownloadRequest>();

        static void Main(string[] args)
        {
            authentication();
            downloadAllRecordings(dates);

            // Final Output
            Console.WriteLine("DONE");

            if (Debugger.IsAttached)
            {
                Console.ReadKey();
            }
        }

        public static void authentication()
        {
            //OAuth input
            Console.Write("Enter Client ID: ");
            clientId = Console.ReadLine();
            Console.Write("Enter Client Secret: ");
            clientSecret = Console.ReadLine();

            // Get the Date Interval
            Console.Write("Enter Date Interval (YYYY-MM-DDThh:mm:ss/YYYY-MM-DDThh:mm:ss): ");
            dates = Console.ReadLine();

            Console.WriteLine("Working...");

            //Set Region
            PureCloudRegionHosts region = PureCloudRegionHosts.us_east_1;
            Configuration.Default.ApiClient.setBasePath(region);

            // Configure SDK Settings
            var accessTokenInfo = Configuration.Default.ApiClient.PostToken(clientId, clientSecret);
            Configuration.Default.AccessToken = accessTokenInfo.AccessToken;

            // Create API instances
            conversationsApi = new ConversationsApi();
            recordingApi = new RecordingApi();
        }

        public static void downloadAllRecordings(string dates)
        {
            Console.WriteLine("Start batch request process.");
            BatchDownloadJobStatusResult completedBatchStatus = new BatchDownloadJobStatusResult();

            // Process and build the request for downloading the recordings
            // Get the conversations within the date interval and start adding them to batch request
            AnalyticsConversationQueryResponse conversationDetails = conversationsApi.PostAnalyticsConversationsDetailsQuery(new ConversationQuery(Interval: dates));

            foreach (var conversations in conversationDetails.Conversations)
            {
                addConversationRecordingsToBatch(conversations.ConversationId);
            }

            // Send a batch request and start polling for updates
            BatchDownloadJobSubmissionResult result = recordingApi.PostRecordingBatchrequests(batchRequestBody);
            completedBatchStatus = getRecordingStatus(result);

            // Start downloading the recording files individually
            foreach (var recording in completedBatchStatus.Results)
            {
                downloadRecording(recording);
            }
        }

        // Get all the recordings metadata of the conversation and add it to the global batch request object
        public static void addConversationRecordingsToBatch(string conversationId)
        {
            List<RecordingMetadata> recordingsData = recordingApi.GetConversationRecordingmetadata(conversationId);

            // Iterate through every result, check if there are one or more recordingIds in every conversation
            foreach (var recording in recordingsData)
            {
                BatchDownloadRequest batchRequest = new BatchDownloadRequest();
                batchRequest.ConversationId = recording.ConversationId;
                batchRequest.RecordingId = recording.Id;

                batchDownloadRequestList.Add(batchRequest);
                batchRequestBody.BatchDownloadRequestList = batchDownloadRequestList;

                Console.WriteLine("Added " + recording.ConversationId + " to batch request");
            }
        }

        // Plot conversationId and recordingId to request for batchdownload Recordings
        private static BatchDownloadJobStatusResult getRecordingStatus(BatchDownloadJobSubmissionResult recordingBatchRequest)
        {
            Console.WriteLine("Processing the recordings...");
            BatchDownloadJobStatusResult result = new BatchDownloadJobStatusResult();

            result = recordingApi.GetRecordingBatchrequest(recordingBatchRequest.Id);

            if (result.ExpectedResultCount != result.ResultCount)
            {
                Console.WriteLine("Batch Result Status:" + result.ResultCount + " / " + result.ExpectedResultCount);

                // Simple polling through recursion
                Thread.Sleep(5000);
                return getRecordingStatus(recordingBatchRequest);
            }

            // Once result count reach expected.
            return result;
        }

        // Download Recordings
        private static void downloadRecording(BatchDownloadJobResult recording)
        {
            Console.WriteLine("Downloading now. Please wait...");

            String ext = getExtension(recording);
            String conversationId = recording.ConversationId;
            String recordingId = recording.RecordingId;
            String sourceURL = recording.ResultUrl;

            String targetDirectory = ".";

            string filename = conversationId + "_" + recordingId;

            using (WebClient wc = new WebClient())
                wc.DownloadFile(sourceURL, targetDirectory + "\\" + filename + "." + ext);
        }

        // Get extension of a recording
        private static string getExtension(BatchDownloadJobResult recording)
        {
            // Store the contentType to a variable that will be used later to determine the extension of recordings.
            string contentType = recording.ContentType;

            // Split the text and gets the extension that will be used for the recording
            string ext = contentType.Split('/').Last();

            // For the JSON special case
            if (ext.Length >= 4)
            {
                ext = ext.Substring(0, 4);
            }

            return ext;
        }
    }
}
