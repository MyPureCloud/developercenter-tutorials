import socket, re, requests, webbrowser

def validateToken(token):
	# Prepare for GET /api/v2/authorization/roles request
	requestHeaders = {
		'Authorization': 'Bearer ' + token
	}

	# Get user
	response = requests.get('https://api.mypurecloud.com/api/v2/users/me', headers=requestHeaders)

	# Check response
	if response.status_code == 200:
		# Get JSON response body
		responseJson = response.json()
		print '\n*** USER DATA ***'
		print '  id: ' + responseJson['id']
		print '  name: ' + responseJson['name']
		print '  email: ' + responseJson['email']
	else:
		print 'Failure: ' + str(response.status_code) + ' - ' + response.reason

HOST, PORT = '', 8080

listen_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
listen_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
listen_socket.bind((HOST, PORT))
listen_socket.listen(1)
print 'Serving HTTP on port %s ...' % PORT

webbrowser.open('http://localhost:' + str(PORT))

while True:
	client_connection, client_address = listen_socket.accept()
	request = client_connection.recv(1024)
	responseStatus = ''
	responseBody = ''

	# Parse out request verb and path
	matchObj = re.match(r'(GET) (\/.*) HTTP', request)
	verb = matchObj.group(1)
	path = matchObj.group(2)
	print '[REQUEST] ' + verb + ' ' + path
	http_response = ''

	if path == '/' and verb == 'GET':
		# GET /
		with open('implicit.html', 'r') as htmlFile:
			responseStatus = 'HTTP/1.1 200 OK'
			responseBody = htmlFile.read()
	elif path.startswith('/token/') and verb == 'GET':
		# GET /token/<token>
		token = path[7:]
		responseStatus = 'HTTP/1.1 200 OK'
		validateToken(token)
	else:
		# Invalid resource
		responseStatus ='HTTP/1.1 404 NOT FOUND'
		responseBody = '404: NOT FOUND'

	# Send response
	http_response = responseStatus + '\n\n' + responseBody
	print '[RESPONSE] ' + responseStatus + '\n'
	client_connection.sendall(http_response)
	client_connection.close()