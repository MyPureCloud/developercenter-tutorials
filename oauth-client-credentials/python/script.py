import base64, requests, sys

print '-----------------------------------------------'
print '- PureCloud Python Client Credentials Example -'
print '-----------------------------------------------'

clientId = '7de3af06-c0b3-4f9b-af45-72f4a1403797'
clientSecret = '1duphi_YtswNjN2GXOg_APY-KKTmnYXvfNj7N8GUhnM'
# Base64 encode the client ID and client secret
authorization = base64.b64encode(clientId + ':' + clientSecret)

# Prepare for POST /oauth/token request
requestHeaders = {
	'Authorization': 'Basic ' + authorization,
	'Content-Type': 'application/x-www-form-urlencoded'
}
requestBody = {
	'grant_type': 'client_credentials'
}

# Get token
response = requests.post('https://login.mypurecloud.com/oauth/token', data=requestBody, headers=requestHeaders)

# Check response
if response.status_code == 200:
	print 'Got token'
else:
	print 'Failure: ' + str(response.status_code) + ' - ' + response.reason
	sys.exit(response.status_code)

# Get JSON response body
responseJson = response.json()

# Prepare for GET /api/v2/authorization/roles request
requestHeaders = {
	'Authorization': responseJson['token_type'] + ' ' + responseJson['access_token']
}

# Get roles
response = requests.get('https://api.mypurecloud.com/api/v2/authorization/roles', headers=requestHeaders)

# Check response
if response.status_code == 200:
	print 'Got roles'
else:
	print 'Failure: ' + str(response.status_code) + ' - ' + response.reason
	sys.exit(response.status_code)

# Print roles
print '\nRoles:'
for entity in response.json()['entities']:
	print '  ' + entity['name']

print '\nDone'