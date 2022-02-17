package com.genesys;

import com.mypurecloud.sdk.v2.ApiClient;
import com.mypurecloud.sdk.v2.PureCloudRegionHosts;
import com.mypurecloud.sdk.v2.api.ConversationsApi;
import com.mypurecloud.sdk.v2.model.SendAgentlessOutboundMessageRequest;
import com.mypurecloud.sdk.v2.model.SendAgentlessOutboundMessageResponse;


public class Main {
    
    public static void main(String[] args) {
        try {
            // Define your OAuth client credentials
            final String clientId = System.getenv("GENESYS_CLOUD_CLIENT_ID");
            final String clientSecret = System.getenv("GENESYS_CLOUD_CLIENT_SECRET");
            // orgRegion value example: us_east_1
            final String orgRegion = System.getenv("GENESYS_CLOUD_REGION");

            // Set Region
            PureCloudRegionHosts region = PureCloudRegionHosts.valueOf(orgRegion);

            // Define APIs
            ApiClient oAuthApiClient;
            ConversationsApi conversationApi;
            
            //Generate the OAuth access token
            try {
                //Make sure to specify the correct base path for your Genesys Cloud region. see https://developer.mypurecloud.com/api/rest/
                oAuthApiClient = ApiClient.Builder.standard()
                        .withBasePath(region)
                        .build();
                oAuthApiClient.authorizeClientCredentials(clientId, clientSecret);

            } catch (Exception ex) {
                throw new RuntimeException("Error setting up oAuth credentials", ex);
            }
            
            //Instantiate conversation api with Oauth client
            conversationApi = new ConversationsApi(oAuthApiClient);
            
            //Setup the sms notification request
            SendAgentlessOutboundMessageRequest sendAgentlessOutboundMessageRequest = new SendAgentlessOutboundMessageRequest();
            sendAgentlessOutboundMessageRequest.setFromAddress("+13178723000");
            sendAgentlessOutboundMessageRequest.setToAddressMessengerType(SendAgentlessOutboundMessageRequest.ToAddressMessengerTypeEnum.SMS);
            sendAgentlessOutboundMessageRequest.setToAddress("+15557655942");
            sendAgentlessOutboundMessageRequest.setTextBody("Hello, this is a test notification");
            
            //Send the sms notification
            SendAgentlessOutboundMessageResponse sendAgentlessOutboundMessageResponse =
                    conversationApi.postConversationsMessagesAgentless(sendAgentlessOutboundMessageRequest);
            
            System.out.println(sendAgentlessOutboundMessageResponse.toString());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
