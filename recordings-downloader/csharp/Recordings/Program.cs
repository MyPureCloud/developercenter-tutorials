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
            RecordingApi recordingApi = new RecordingApi();

            // Get Conversation IDs and corresponding Media Type within a date interval
            Dictionary<string, AnalyticsSession.MediaTypeEnum> conversationsMapIDType = GetConversations(interval, conversationsApi);

            // Use the Conversation IDs and request a batch download for the conversations
            string jobId = RequestBatchDownload(conversationsMapIDType.Keys.ToList(), recordingApi);

            // Get all conversations with recordings
            List<BatchDownloadJobResult> jobResults = GetJobResults(jobId, recordingApi);

            // Download all the recordings and separate into folders named after the Conversation ID
            Console.WriteLine("Currently Downloading...");
            string path = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            path = path.Substring(0, path.LastIndexOf("bin"));

            foreach (var job in jobResults)
            {
                // Create the directories for each unique Conversation IDs
                System.IO.Directory.CreateDirectory(path + "\\recordings\\" + job.ConversationId);

                // Determine the file extension to assign
                string extension = GetExtensionFromMediaType(conversationsMapIDType[job.ConversationId]);

                DownloadRecording(job.ResultUrl, path + "recordings\\" + job.ConversationId, extension);
            }

            // Final Output
            Console.WriteLine("DONE");

            if (Debugger.IsAttached)
            {
                Console.ReadKey();
            }
        }

        /// <summary>
        /// Get the conversation made within a specified duration. MediaType will be determined by media type of the first session in the conversation.
        /// </summary>
        /// <param name="interval"></param>
        /// <param name="api"></param>
        /// <returns></returns>
        private static Dictionary<string, AnalyticsSession.MediaTypeEnum> GetConversations(string interval, ConversationsApi api)
        {
            // Request the list of conversations
            List<AnalyticsConversation> conversations = api.PostAnalyticsConversationsDetailsQuery(new ConversationQuery(Interval: interval)).Conversations;

            // Dictionary to contain the conversations and media type
            Dictionary<string, AnalyticsSession.MediaTypeEnum> conversationsMap = new Dictionary<string, AnalyticsSession.MediaTypeEnum>();

            //Store the conversation IDs and the corresponding media type
            foreach (var conversation in conversations)
            {
                conversationsMap.Add(conversation.ConversationId, conversation.Participants.First().Sessions.First().MediaType.Value);
            }

            return conversationsMap;
        }

        /// <summary>
        /// Request a job to download recordings assosciated with the specified conversations
        /// </summary>
        /// <param name="conversationIDs"></param>
        /// <param name="api"></param>
        /// <returns></returns>
        private static string RequestBatchDownload(List<string> conversationIDs, RecordingApi api)
        {
            // Convert List of Strings to List of BatchDownloadRequests
            List<BatchDownloadRequest> batchRequest = new List<BatchDownloadRequest>();

            foreach (string id in conversationIDs)
            {
                BatchDownloadRequest batchDownloadRequest = new BatchDownloadRequest(ConversationId: id);
                batchRequest.Add(batchDownloadRequest);
            }

            // Create the batch job with the request list
            BatchDownloadJobSubmission batchSubmission = new BatchDownloadJobSubmission(BatchDownloadRequestList: batchRequest);

            return api.PostRecordingBatchrequests(batchSubmission).Id;
        }

        /// <summary>
        /// Get the results of the batch job with recording urls
        /// </summary>
        /// <param name="jobId"></param>
        /// <param name="api"></param>
        /// <returns></returns>
        private static List<BatchDownloadJobResult> GetJobResults(string jobId, RecordingApi api)
        {
            int expectedCount = (int)api.GetRecordingBatchrequest(jobId).ExpectedResultCount;
            int resultCount = 0;

            // Concurrently update every 5 seconds if job has finished processing.
            do {
                Thread.Sleep(5000);
                resultCount = (int)api.GetRecordingBatchrequest(jobId).ResultCount;
                Console.WriteLine("Processed: " + resultCount + " / " + expectedCount);
            } while (resultCount < expectedCount);

            // Filter the list to only include those with recording urls
            return api.GetRecordingBatchrequest(jobId).Results.Where(x => x.ResultUrl != null).ToList();
        }

        /// <summary>
        /// Download the recording as a wav file
        /// </summary>
        /// <param name="sourceURL"></param>
        /// <param name="targetDirectory"></param>
        private static void DownloadRecording(string sourceURL, string targetDirectory, string extension)
        {
            string filename = targetDirectory.Substring(targetDirectory.LastIndexOf('\\') + 1, 36);

            using (WebClient wc = new WebClient())
                wc.DownloadFile(sourceURL, targetDirectory + "\\" + filename + extension);
        }

        /// <summary>
        /// Get the appropriate extension from the given Media Type
        /// </summary>
        /// <param name="mediaType"></param>
        /// <returns></returns>
        private static string GetExtensionFromMediaType(AnalyticsSession.MediaTypeEnum mediaType)
        {
            switch (mediaType)
            {
                case AnalyticsSession.MediaTypeEnum.Voice:
                    return ".wav";
                case AnalyticsSession.MediaTypeEnum.Chat:
                    return ".txt";
                case AnalyticsSession.MediaTypeEnum.Email:
                    return ".txt";
                default:
                    return "";
            }
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
