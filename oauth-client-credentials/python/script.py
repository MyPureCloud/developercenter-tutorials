import base64, requests, sys

print("---------------------------------------------------")
print("- Genesys Cloud Python Client Credentials Example -")
print("---------------------------------------------------")

client_id = "CLIENT_ID"
client_secret = "CLIENT_SECRET"
# Base64 encode the client ID and client secret
authorization = base64.b64encode(bytes(client_id + ":" + client_secret, "ISO-8859-1")).decode("ascii")

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

# Get JSON response body
response_json = response.json()

# Prepare for GET /api/v2/authorization/roles request
requestHeaders = {
    "Authorization": f"{ response_json['token_type'] } { response_json['access_token']}"
}

# Get roles
response = requests.get("https://api.mypurecloud.com/api/v2/authorization/roles", headers=requestHeaders)

# Check response
if response.status_code == 200:
    print("Got roles")
else:
    print(f"Failure: { str(response.status_code) } - { response.reason }")
    sys.exit(response.status_code)

# Print roles
print("\nRoles:")
for entity in response.json()["entities"]:
    print(f"  { entity['name'] }")

print("\nDone")
