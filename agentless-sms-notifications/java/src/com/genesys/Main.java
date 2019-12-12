package com.genesys;

import com.mypurecloud.sdk.v2.ApiClient;
import com.mypurecloud.sdk.v2.api.ConversationsApi;
import com.mypurecloud.sdk.v2.model.*;


public class Main {
    
    public static void main(String[] args) {
        try {
            //Define your OAuth client credentials
            final String clientId = "e07e5863-48ec-4b59-bf76-88e07dc33t98";
            final String clientSecret = "ncvyR0yk7heFwNze0pm83wcRa-Ayg56RZX92dSHIEJG";
            
            // Define APIs
            ApiClient oAuthApiClient;
            ConversationsApi conversationApi;
            
            //Generate the OAuth access token
            try {
                oAuthApiClient = ApiClient.Builder.standard().withBasePath("https://api.mypurecloud.com").build();
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
            sendAgentlessOutboundMessageRequest.setToAddress("+13178723001");
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
