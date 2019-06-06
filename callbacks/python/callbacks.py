import base64, csv, sys, requests
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print('-------------------------------------------------------------')
print('- Python3 Create Callback -')
print('-------------------------------------------------------------')

# PureCloud Objects
conversations_api = PureCloudPlatformClientV2.ConversationsApi()

# OAuth when using Client Credentials
client_id = 'CLIENT_ID'
client_secret = 'CLIENT_SECRET'
authorization = base64.b64encode(bytes(client_id + ':' + client_secret, 'ISO-8859-1')).decode('ascii')

# Prepare for POST /oauth/token request
request_headers = {
    "Authorization": f"Basic {authorization}",
    "Content-Type": "application/x-www-form-urlencoded"
}
request_body = {
    "grant_type": "client_credentials"
}

# Get token
response = requests.post("https://login.mypurecloud.com/oauth/token", data=request_body, headers=request_headers)

# Check response
if response.status_code == 200:
    print("Got token")
else:
    print(f"Failure: { str(response.status_code) } - { response.reason }")
    sys.exit(response.status_code)

# Assign the token
PureCloudPlatformClientV2.configuration.access_token = response.json()["access_token"]

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
