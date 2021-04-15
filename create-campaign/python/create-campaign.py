import base64, csv, sys, requests, os
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print("-------------------------------------------------------------")
print("- Python3 Create an Outbound Dialing Campaign -")
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
outbound_api = PureCloudPlatformClientV2.OutboundApi(api_client)
scripts_api = PureCloudPlatformClientV2.ScriptsApi(api_client)
routing_api = PureCloudPlatformClientV2.RoutingApi(api_client)

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
campaign_configuration.contact_list = PureCloudPlatformClientV2.DomainEntityRef()
campaign_configuration.contact_list.id = contact_list_id
campaign_configuration.phone_columns = [PureCloudPlatformClientV2.PhoneColumn()]
campaign_configuration.phone_columns[0].column_name = "phone"
campaign_configuration.phone_columns[0].type = "home"
pprint(campaign_configuration.phone_columns)
campaign_configuration.queue = PureCloudPlatformClientV2.DomainEntityRef()
campaign_configuration.queue.id = queue_id
campaign_configuration.script = PureCloudPlatformClientV2.DomainEntityRef()
campaign_configuration.script.id = script_id
campaign_configuration.caller_name = "Caller ID"
campaign_configuration.caller_address = "5551231234"

print("Creating Campaign")
campaign = outbound_api.post_outbound_campaigns(campaign_configuration)

pprint(f"Campaign created: { campaign }")
