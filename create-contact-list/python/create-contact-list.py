import base64, csv, sys, requests
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print('-------------------------------------------------------------')
print('- Python3 Create Contact List -')
print('-------------------------------------------------------------')

# PureCloud Objects
outbound_api = PureCloudPlatformClientV2.OutboundApi()

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

contact_list_configuration = PureCloudPlatformClientV2.ContactList()
contact_list_configuration.name = "My Contact List"
contact_list_configuration.column_names = ["First Name",
                                           "Last Name",
                                           "Home",
                                           "Work",
                                           "Cell",
                                           "Contact ID"]
contact_list_configuration.phone_columns = []
phone_columns = [{'columnName': 'Cell', 'type': 'cell'},
                 {'columnName': 'Home', 'type': 'home'}]
for phone_column in phone_columns:
    temp = PureCloudPlatformClientV2.ContactPhoneNumberColumn()
    temp.column_name = phone_column['columnName']
    temp.type = phone_column['type']
    contact_list_configuration.phone_columns.append(temp)

try:
    # Create a contact List.
    api_response = outbound_api.post_outbound_contactlists(contact_list_configuration)
    print("Contact List: ")
    pprint(api_response)
except ApiException as e:
    print(f"Exception when calling OutboundApi->post_outbound_contactlists: { e }")
