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

namespace csharp
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
