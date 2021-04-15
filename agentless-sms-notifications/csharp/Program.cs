using System;
using PureCloudPlatform.Client.V2.Api;
using PureCloudPlatform.Client.V2.Client;
using PureCloudPlatform.Client.V2.Extensions;
using PureCloudPlatform.Client.V2.Model;

namespace csharp
{
    class Program
    {
        static void Main(string[] args)
        {
            // OAuth Credentials
            string clientId = Environment.GetEnvironmentVariable("GENESYS_CLOUD_CLIENT_ID");
            string clientSecret = Environment.GetEnvironmentVariable("GENESYS_CLOUD_CLIENT_SECRET");
            // orgRegion value example: us_east_1
            string orgRegion = Environment.GetEnvironmentVariable("GENESYS_CLOUD_REGION");

            // Set Region
            PureCloudRegionHosts region = Enum.Parse<PureCloudRegionHosts>(orgRegion);
            Configuration.Default.ApiClient.setBasePath(region);
            
            // Configure SDK Settings
            var accessTokenInfo = Configuration.Default.ApiClient.PostToken(clientId, clientSecret);
            string accessToken = accessTokenInfo.AccessToken;
            PureCloudPlatform.Client.V2.Client.Configuration.Default.AccessToken = accessToken;

            // Instantiate APIs
            ConversationsApi conversationsApi = new ConversationsApi();

            // Build request body
            SendAgentlessOutboundMessageRequest request = new SendAgentlessOutboundMessageRequest();
            request.FromAddress = "+13178723000";
            request.ToAddress = "+15557655942";
            request.ToAddressMessengerType = SendAgentlessOutboundMessageRequest.ToAddressMessengerTypeEnum.Sms;
            request.TextBody = "Hello, this is a test notification";

            // Call to PostConversationsMessagesAgentless function of Conversations API
            SendAgentlessOutboundMessageResponse response = conversationsApi.PostConversationsMessagesAgentless(request);

            // Final Output
            Console.WriteLine(response.ToString());
        }
    }
}
