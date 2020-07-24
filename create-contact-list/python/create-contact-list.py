import base64, csv, sys, requests, os
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print('-------------------------------------------------------------')
print('- Python3 Create Contact List -')
print('-------------------------------------------------------------')

# OAuth when using Client Credentials
apiClient = PureCloudPlatformClientV2.api_client.ApiClient().get_client_credentials_token(os.environ['GENESYS_CLOUD_CLIENT_ID'], os.environ['GENESYS_CLOUD_CLIENT_SECRET'])

# Genesys Cloud Objects
outbound_api = PureCloudPlatformClientV2.OutboundApi(apiClient)

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
