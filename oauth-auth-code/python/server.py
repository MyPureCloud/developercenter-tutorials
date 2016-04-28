import socket, re, requests, webbrowser, urllib, urlparse, uuid, base64

defaultResponseHeaders = 'Cache-Control: no-cache, no-store, must-revalidate\n' +\
	'Pragma: no-cache\n' +\
	'Expires: 0\n'

sessionMap = {}
clientId = '6220730c-d0e4-4fde-af3d-5ff38ca94e22'
clientSecret = 'BC2GlOXcBXof56PSR8CA0TB6tHdlTDELPEQ8hwf87kI'
redirectUri = 'http://localhost:8080/oauth2/callback'

def getMe(token):
	# Prepare for GET /api/v2/users/me request
	requestHeaders = {
		'Authorization': 'Bearer ' + token
	}

	# Get user
	response = requests.get('https://api.mypurecloud.com/api/v2/users/me', headers=requestHeaders)

	# Check response
	if response.status_code == 200:
		return response.content
	else:
		print 'Failure: ' + str(response.status_code) + ' - ' + response.reason
		return None

def checkSession(path):
	# Parse URL and querystring
	url = urlparse.urlparse(path)
	qs = urlparse.parse_qs(url.query)

	# Look for existing session
	sessionKey = ''
	sessionKeyArray = qs.get('sessionKey')
	if sessionKeyArray is not None:
		sessionKey = sessionKeyArray[0]

	if sessionKey != '':
		# Return existing session
		session = sessionMap.get(sessionKey)

		# Log session key if session is found
		if session is not None:
			print 'Session key: ' + sessionKey
		else:
			print 'Invalid session key encountered!'

		# Will return the session or None of session key wasn't found
		return session
	elif qs.get('code') is not None:
		# No session, but have an oauth code. Create a session
		accessToken = getTokenFromCode(qs.get('code'))

		# Check token
		if accessToken is None:
			return None

		# Create session object
		sessionKey = str(uuid.uuid4());
		session = { 
			'access_token': accessToken,
			'session_key': sessionKey
		}
		sessionMap[sessionKey] = session

		# Return new session
		return session
	else:
		# Didn't find a session key or an oauth code
		return None

def getTokenFromCode(code):
	# Prepare for POST /oauth/token request
	requestHeaders = {
		'Authorization': 'Basic ' + base64.b64encode(clientId + ':' + clientSecret),
		'Content-Type': 'application/x-www-form-urlencoded'
	}
	requestBody = {
		'grant_type': 'authorization_code',
		'code': code,
		'redirect_uri': redirectUri
	}

	# Get token
	response = requests.post('https://login.mypurecloud.com/oauth/token', data=requestBody, headers=requestHeaders)

	# Check response
	if response.status_code == 200:
		responseJson = response.json()
		return responseJson['access_token']
	else:
		print 'Failure: ' + str(response.status_code) + ' - ' + response.reason
		return None

HOST, PORT = '', 8080

listen_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
listen_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
listen_socket.bind((HOST, PORT))
listen_socket.listen(1)
print '-----------------------------'
print '- Serving HTTP on port %s -' % PORT
print '-----------------------------'

webbrowser.open('http://localhost:' + str(PORT))

while True:
	client_connection, client_address = listen_socket.accept()
	request = client_connection.recv(1024)

	# Parse out request verb and path
	matchObj = re.match(r'(GET) (\/.*) HTTP', request)
	verb = matchObj.group(1)
	path = matchObj.group(2)
	print '[REQUEST] ' + verb + ' ' + path

	# Initialize vars
	responseStatus = ''
	responseBody = ''
	http_response = ''
	responseHeaders = defaultResponseHeaders

	# Get session from session map
	session = checkSession(path)

	if session is None:
		# No session, redirect to auth page
		responseStatus = 'HTTP/1.1 303 See Other\n' +\
			'Location: https://login.mypurecloud.com/oauth/authorize?' +\
			'response_type=code' +\
			'&client_id=' + clientId +\
			'&redirect_uri=' + urllib.quote(redirectUri, safe='')
	elif path.startswith('/oauth2/callback') and verb == 'GET':
		# OAuth redirect callback, redirect to app page and include generated session_key
		responseStatus = 'HTTP/1.1 303 See Other\n' +\
			'Location: /my_info.html?sessionKey=' + session['session_key']
	elif path.startswith('/my_info.html') and verb == 'GET':
		# app's main page
		with open('my_info.html', 'r') as htmlFile:
			responseStatus = 'HTTP/1.1 200 OK'
			responseBody = htmlFile.read()
	elif path.startswith('/me') and verb == 'GET':
		# Request to get /api/v2/users/me
		me = getMe(session['access_token'])
		if me is None:
			responseStatus ='HTTP/1.1 404 NOT FOUND'
			responseBody = '404: NOT FOUND'
		else:
			responseStatus = 'HTTP/1.1 200 OK'
			responseHeaders += 'Content-Type: application/json\n'
			responseBody = me
	elif path.startswith('/') and verb == 'GET':
		# Nothing here, redirect to main app's page
		responseStatus = 'HTTP/1.1 303 See Other\n' +\
			'Location: /my_info.html?sessionKey=' + session['session_key']
	else:
		# Invalid resource
		responseStatus ='HTTP/1.1 404 NOT FOUND'
		responseBody = '404: NOT FOUND'

	# Send response
	http_response = responseStatus + '\n' + responseHeaders + '\n' + responseBody
	print '[RESPONSE] ' + responseStatus.splitlines()[0] + '\n'
	client_connection.sendall(http_response)
	client_connection.close()