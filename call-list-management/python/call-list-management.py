import base64, sys, requests, os
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print("-------------------------------------------------------------")
print("- Dialer Call List Management -")
print("-------------------------------------------------------------")

# Use your own IDs here
contact_list_id = "cc1f7deb-0ca2-422d-b152-62dc092f05cc"
campaign_id = "af5624eb-c445-4fdf-a659-d93f61d84395"

# OAuth when using Client Credentials
apiClient = PureCloudPlatformClientV2.api_client.ApiClient().get_client_credentials_token(os.environ['PURECLOUD_CLIENT_ID'], os.environ['PURECLOUD_CLIENT_SECRET'])

# PureCloud Objects
outbound_api = PureCloudPlatformClientV2.OutboundApi(apiClient)

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
    # This won't affect the object's properties in PureCloud side.
    campaign_info.date_modified = ""
    campaign_info.date_created = ""

    print("Activating Campaign")
    try:
        outbound_api.put_outbound_campaign(campaign_id, campaign_info)
    except ApiException as e:
        print(f"Exception when calling OutboundApi->put_outbound_campaign: {e}")
        sys.exit()

    print("Campaign activated.")
