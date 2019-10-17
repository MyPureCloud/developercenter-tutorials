import base64, sys, requests, os
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print('-------------------------------------------------------------')
print('- Uploading Architect Prompts -')
print('-------------------------------------------------------------')

# OAuth when using Client Credentials
apiClient = PureCloudPlatformClientV2.api_client.ApiClient().get_client_credentials_token(os.environ['PURECLOUD_CLIENT_ID'], os.environ['PURECLOUD_CLIENT_SECRET'])

# PureCloud Objects
architect_api = PureCloudPlatformClientV2.ArchitectApi(apiClient)

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
                                headers={"Authorization": f"bearer {apiClient.access_token}"})

print("Upload complete. Review your prompt in architect.")
print("https://apps.mypurecloud.com/architect/#/call/userprompts")
pprint(upload_response)
