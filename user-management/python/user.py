import time
import PureCloudPlatformClientV2, os
from PureCloudPlatformClientV2.rest import ApiException
from pprint import pprint

# OAuth when using Client Credentials
apiClient = PureCloudPlatformClientV2.api_client.ApiClient().get_client_credentials_token(os.environ['PURECLOUD_CLIENT_ID'], os.environ['PURECLOUD_CLIENT_SECRET'])

api_instance = PureCloudPlatformClientV2.UsersApi(apiClient)
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