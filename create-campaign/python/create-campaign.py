import base64, csv, sys, requests
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print("-------------------------------------------------------------")
print("- Python3 Create an Outbound Dialing Campaign -")
print("-------------------------------------------------------------")

# PureCloud Objects
outbound_api = PureCloudPlatformClientV2.OutboundApi()
scripts_api = PureCloudPlatformClientV2.ScriptsApi()
routing_api = PureCloudPlatformClientV2.RoutingApi()

# OAuth when using Client Credentials
client_id = "CLIENT_ID"
client_secret = "CLIENT_SECRET"
authorization = base64.b64encode(bytes(client_id + ":" + client_secret, "ISO-8859-1")).decode("ascii")

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

# Set your own values here
CONTACT_LIST_NAME = "A List"
QUEUE_NAME = "Queue 1"
SCRIPT_NAME = "Outbound 1"

# Get contact list by name
contact_lists = outbound_api.get_outbound_contactlists(name=CONTACT_LIST_NAME)
pprint(f"Contact Lists: {contact_lists}")

if (len(contact_lists.entities) == 0 or
        contact_lists.entities[0].name != CONTACT_LIST_NAME):
    raise ValueError("Failed to find Contact List")

contact_list_id = contact_lists.entities[0].id

print(f"Found contact list {contact_list_id}")

# Get queue by name
queue = routing_api.get_routing_queues(name=QUEUE_NAME)
pprint(f"Queues: {queue}")

if (len(queue.entities) == 0 or
        queue.entities[0].name != QUEUE_NAME):
    raise ValueError("Failed to Queue!")

queue_id = queue.entities[0].id
print(f"Found queue {queue_id}")

# Get script by name
script = scripts_api.get_scripts(name=SCRIPT_NAME)
pprint(f"Scripts: {script}")

if (len(script.entities) == 0 or
        script.entities[0].name != SCRIPT_NAME):
    raise ValueError("Failed to script!")

script_id = script.entities[0].id
print(f"Found script {script_id}")

# Build create campaign request.
# Configure this based on your call list configuration

campaign_configuration = PureCloudPlatformClientV2.Campaign()

campaign_configuration.name = "My Campaign 1"
campaign_configuration.dialing_mode = "preview"
campaign_configuration.contact_list = PureCloudPlatformClientV2.UriReference()
campaign_configuration.contact_list.id = contact_list_id
campaign_configuration.phone_columns = [PureCloudPlatformClientV2.PhoneColumn()]
campaign_configuration.phone_columns[0].column_name = "phone"
campaign_configuration.phone_columns[0].type = "home"
pprint(campaign_configuration.phone_columns)
campaign_configuration.queue = PureCloudPlatformClientV2.UriReference()
campaign_configuration.queue.id = queue_id
campaign_configuration.script = PureCloudPlatformClientV2.UriReference()
campaign_configuration.script.id = script_id
campaign_configuration.caller_name = "Caller ID"
campaign_configuration.caller_address = "5551231234"

print("Creating Campaign")
campaign = outbound_api.post_outbound_campaigns(campaign_configuration)

pprint(f"Campaign created: { campaign }")
