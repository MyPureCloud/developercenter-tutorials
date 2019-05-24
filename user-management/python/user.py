import time
import PureCloudPlatformClientV2
from PureCloudPlatformClientV2.rest import ApiException
from pprint import pprint

# Configure OAuth2 access token for authorization: PureCloud Auth
PureCloudPlatformClientV2.configuration.access_token = ''

api_instance = PureCloudPlatformClientV2.UsersApi()
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