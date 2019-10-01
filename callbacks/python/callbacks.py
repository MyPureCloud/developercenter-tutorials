import base64, csv, sys, requests
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print('-------------------------------------------------------------')
print('- Python3 Create Callback -')
print('-------------------------------------------------------------')

# OAuth when using Client Credentials
apiclient = PureCloudPlatformClientV2.api_client.ApiClient().get_client_credentials_token(os.environ['PURECLOUD_CLIENT_ID'], os.environ['PURECLOUD_CLIENT_SECRET'])

# PureCloud Objects
conversations_api = PureCloudPlatformClientV2.ConversationsApi(apiclient)

body = PureCloudPlatformClientV2.CreateCallbackCommand()
body.routing_data = PureCloudPlatformClientV2.RoutingData()
body.routing_data.queue_id = "QUEUE_ID"
body.script_id = "SCRIPT_ID"
body.callback_user_name = "Tutorial Callback"
body.callback_numbers = ["3172222222"]
body.data = {
    'customDataAttribute': 'custom value'
}

try:
    # Create a Callback
    api_response = conversations_api.post_conversations_callbacks(body)
    pprint(api_response)
except ApiException as e:
    print(f"Exception when calling ConversationsApi->post_conversations_callbacks: { e }")
