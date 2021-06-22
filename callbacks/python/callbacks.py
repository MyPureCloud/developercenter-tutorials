import base64, csv, sys, requests, os
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print('-------------------------------------------------------------')
print('- Python3 Create Callback -')
print('-------------------------------------------------------------')

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

body = PureCloudPlatformClientV2.CreateCallbackCommand()
body.routing_data = PureCloudPlatformClientV2.RoutingData()
body.routing_data.queue_id = "QUEUE_ID"
body.script_id = "SCRIPT_ID"
body.callback_user_name = "Tutorial Callback"
body.callback_numbers = ["3172222222"]
body.caller_id = "+13175555555"
body.caller_id_name = "John Doe"
body.data = {
    'customDataAttribute': 'custom value'
}

try:
    # Create a Callback
    api_response = conversations_api.post_conversations_callbacks(body)
    pprint(api_response)
except ApiException as e:
    print(f"Exception when calling ConversationsApi->post_conversations_callbacks: { e }")
