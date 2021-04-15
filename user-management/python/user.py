import time
import PureCloudPlatformClientV2, os
from PureCloudPlatformClientV2.rest import ApiException
from pprint import pprint

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

api_instance = PureCloudPlatformClientV2.UsersApi(api_client)

newuser = PureCloudPlatformClientV2.CreateUser() 
newuser.name = "Tutorial User"
newuser.email = "tutorial35@example.com"
newuser.password = "230498wkjdf8asdfoiasdf"

currentuser = api_instance.post_users(newuser)

print(currentuser.id)

updateuser = PureCloudPlatformClientV2.UpdateUser() 
updateuser.name = "Tutorial User New Name"
updateuser.version = currentuser.version

newaddress = PureCloudPlatformClientV2.Contact()
newaddress.address = "3172222222"
newaddress.media_type = "PHONE"
newaddress.type = "WORK"

updateuser.addresses = [newaddress]

api_response = api_instance.patch_user(currentuser.id, updateuser)