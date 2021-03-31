import base64, sys, requests, os
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print("-------------------------------------------------------------")
print("- Dialer Call List Management -")
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


# Use your own IDs here
contact_list_id = "cc1f7deb-0ca2-422d-b152-62dc092f05cc"
campaign_id = "af5624eb-c445-4fdf-a659-d93f61d84395"

# Genesys Cloud Objects
outbound_api = PureCloudPlatformClientV2.OutboundApi(api_client)

contact_data = [PureCloudPlatformClientV2.WritableDialerContact()]
contact_data[0].contact_list_id = contact_list_id
contact_data[0].callable = True
contact_data[0].data = {
    "name": "John Doe",
    "phone": "3172222222",
}

try:
    outbound_api.post_outbound_contactlist_contacts(contact_list_id, contact_data)
except ApiException as e:
    print(f"Exception when calling OutboundApi->post_outbound_contactlist_contacts: {e}")
    sys.exit()

print("Contact added to list.")

# Get the campaign's configuration
try:
    campaign_info = outbound_api.get_outbound_campaign(campaign_id)
except ApiException as e:
    print(f"Exception when calling OutboundApi->get_outbound_campaign: {e}")
    sys.exit()

pprint(f"Campaign info: {campaign_info}")

# If campaign is not on, update it so it is on
if campaign_info.campaign_status != 'on':
    campaign_info.campaign_status = 'on'

    # datetime properties need to be converted to string if part of a request
    # these are optional so we'll just be assigning a blank string.
    # This won't affect the object's properties in Genesys Cloud side.
    campaign_info.date_modified = ""
    campaign_info.date_created = ""

    print("Activating Campaign")
    try:
        outbound_api.put_outbound_campaign(campaign_id, campaign_info)
    except ApiException as e:
        print(f"Exception when calling OutboundApi->put_outbound_campaign: {e}")
        sys.exit()

    print("Campaign activated.")
