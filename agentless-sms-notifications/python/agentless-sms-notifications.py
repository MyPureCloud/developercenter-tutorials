import os
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print("-------------------------------------------------------------")
print("- Agentless SMS Notifications -")
print("-------------------------------------------------------------")

# OAuth when using Client Credentials
apiClient = PureCloudPlatformClientV2.api_client.ApiClient() \
            .get_client_credentials_token(os.environ['PURECLOUD_CLIENT_ID'],
                                          os.environ['PURECLOUD_CLIENT_SECRET'])

# PureCloud Objects
conversations_api = PureCloudPlatformClientV2.ConversationsApi(apiClient)

# Body of the request
body = PureCloudPlatformClientV2.SendAgentlessOutboundMessageRequest()
body.from_address = "+13178723000"
body.to_address = "+15557655942"
body.to_address_messenger_type = "sms"
body.text_body = "Hello, this is a test notification"

try:
    # Send the SMS notification request
    response = conversations_api.post_conversations_messages_agentless(body)
    pprint(response)
except ApiException as e:
    print("Exception when calling ConversationsApi->post_conversations_messages_agentless: %s\n" % e)
