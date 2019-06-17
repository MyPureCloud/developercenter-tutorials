import base64, sys, requests
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print('-------------------------------------------------------------')
print('- Uploading Architect Prompts -')
print('-------------------------------------------------------------')

# PureCloud Objects
architect_api = PureCloudPlatformClientV2.ArchitectApi()

# OAuth when using Client Credentials
client_id = 'CLIENT_ID'
client_secret = 'CLIENT_ID'
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

access_token = response.json()["access_token"]

# Assign the token
PureCloudPlatformClientV2.configuration.access_token = access_token

# Create new prompt
print("Creating new prompt...")
prompt_req = PureCloudPlatformClientV2.Prompt()
prompt_req.name = "uploaded_prompt"
prompt_req.description = "Prompt uploaded by upload-prompts example app"

try:
    prompt = architect_api.post_architect_prompts(prompt_req)
except ApiException as e:
    print(f"Exception when calling ArchitectApi->post_architect_prompts: {e}")
    sys.exit()


# Create prompt resource for english
print("Creating prompt resource...")

prompt_asset_req = PureCloudPlatformClientV2.PromptAssetCreate()
prompt_asset_req.language = "en-us"

try:
    prompt_resource = architect_api.post_architect_prompt_resources(prompt.id, prompt_asset_req)
except ApiException as e:
    print(f"Exception when calling ArchitectApi->post_architect_prompts_resources: {e}")
    sys.exit()

# Upload WAV file to prompt
print("Uploading prompt...")

wav_form_data = {
    'file': ('prompt-example.wav', open('../prompt-example.wav', 'rb'))
}

upload_response = requests.post(prompt_resource.upload_uri, files=wav_form_data,
                                headers={"Authorization": f"bearer {access_token}"})

print("Upload complete. Review your prompt in architect.")
print("https://apps.mypurecloud.com/architect/#/call/userprompts")
pprint(upload_response)
