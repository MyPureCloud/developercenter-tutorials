import os
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print("-------------------------------------------------------------")
print("- Agentless SMS Notifications -")
print("-------------------------------------------------------------")

# Credentials
CLIENT_ID = os.environ['GENESYS_CLOUD_CLIENT_ID']
CLIENT_SECRET = os.environ['GENESYS_CLOUD_CLIENT_SECRET']
ORG_REGION = os.environ['GENESYS_CLOUD_REGION']  # eg. us_east_1

# Set environment
region = PureCloudPlatformClientV2.PureCloudRegionHosts[ORG_REGION]
PureCloudPlatformClientV2.configuration.host = region.get_api_host()

# OAuth when using Client Credentials
api_client = PureCloudPlatformClientV2.api_client.ApiClient() \
            .get_client_credentials_token(CLIENT_ID, CLIENT_SECRET)

# Genesys Cloud Objects
conversations_api = PureCloudPlatformClientV2.ConversationsApi(api_client)

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
