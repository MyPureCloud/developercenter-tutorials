from http.server import BaseHTTPRequestHandler, HTTPServer
import os, base64, requests, uuid, urllib.parse, webbrowser

# Genesys Cloud Code Authorization credentials
CLIENT_ID = os.environ["GENESYS_CLOUD_CLIENT_ID"]
CLIENT_SECRET = os.environ["GENESYS_CLOUD_CLIENT_SECRET"]

# Server constants
HOST_NAME = "localhost"
PORT = 8080

session_map = {}
redirect_uri = "http://localhost:8080/oauth2/callback"
html_page = "my_info.html"


class SampleServer(BaseHTTPRequestHandler):
    def do_GET(self):
        session = check_session(self.path)

        if session is None:
            self.send_response(303)
            self.send_header("Content-type", "text/html")
            self.send_header("Location", "https://login.mypurecloud.com/oauth/authorize?" +
                             "response_type=code" +
                             "&client_id=" + CLIENT_ID +
                             "&redirect_uri=" + urllib.parse.quote(redirect_uri, safe=''))
            self.end_headers()
        elif self.path.startswith('/oauth2/callback'):
            # OAuth redirect callback, redirect to app page and include generated session_key
            self.send_response(303)
            self.send_header("Content-type", "text/html")
            self.send_header("Location", f"/{html_page}?sessionKey={session['session_key']}")
            self.end_headers()
        elif self.path.startswith(f"/{html_page}"):
            # app's main page
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            with open(html_page, 'rb') as html_file:
                self.wfile.write(html_file.read())
        elif self.path.startswith('/me'):
            # Request to get /api/v2/users/me
            me = get_me(session['access_token'])
            if me is None:
                self.send_response(404)
                self.wfile.write(bytes("404: Not found", "utf-8"))
            else:
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(me)
        elif self.path.startswith('/'):
            # Nothing here, redirect to main app's page
            self.send_response(303)
            self.send_header("Content-type", "text/html")
            self.send_header("Location", f"/{html_page}?sessionKey={session['session_key']}")
            self.end_headers()
        else:
            # Invalid resource
            self.send_response(404)
            self.wfile.write(bytes("404. Not found.", "utf-8"))


def get_me(token):
    # Prepare for GET /api/v2/users/me request
    request_headers = {
        'Authorization': 'Bearer ' + token
    }

    # Get user
    response = requests.get("https://api.mypurecloud.com/api/v2/users/me", headers=request_headers)

    # Check response
    if response.status_code == 200:
        return response.content
    else:
        print(f"Failure: {str(response.status_code)} - {response.reason}")
        return None


def check_session(path):
    # Parse URL and querystring
    url = urllib.parse.urlparse(path)
    qs = urllib.parse.parse_qs(url.query)

    # Look for existing session
    session_key = ""
    session_key_array = qs.get('sessionKey')
    if session_key_array is not None:
        session_key = session_key_array[0]

    if session_key != '':
        # Return existing session
        session = session_map.get(session_key)

        # Log session key if session is found
        if session is not None:
            print('Session key: ' + session_key)
        else:
            print('Invalid session key encountered!')

        # Will return the session or None of session key wasn't found
        return session
    elif qs.get('code') is not None:
        # No session, but have an oauth code. Create a session
        access_token = get_token_from_code(qs.get('code'))

        # Check token
        if access_token is None:
            return None

        # Create session object
        session_key = str(uuid.uuid4())
        session = {
            'access_token': access_token,
            'session_key': session_key
        }
        session_map[session_key] = session

        # Return new session
        return session
    else:
        # Didn't find a session key or an oauth code
        return None


def get_token_from_code(code):
    # Prepare for POST /oauth/token request
    request_headers = {
        'Authorization': "Basic " +
                         base64.b64encode(bytes(f"{CLIENT_ID}:{CLIENT_SECRET}", "ISO-8859-1")).decode("ascii"),
        'Content-Type': "application/x-www-form-urlencoded"
    }
    request_body = {
        'grant_type': "authorization_code",
        'code': code,
        'redirect_uri': redirect_uri
    }

    # Get token
    response = requests.post("https://login.mypurecloud.com/oauth/token", data=request_body, headers=request_headers)

    # Check response
    if response.status_code == 200:
        response_json = response.json()
        return response_json["access_token"]
    else:
        print(f"Failure: {str(response.status_code)} - {response.reason}")
        return None


if __name__ == "__main__":
    webServer = HTTPServer((HOST_NAME, PORT), SampleServer)
    print(f"Server started http://{HOST_NAME}:{PORT}")
    webbrowser.open(f"http://{HOST_NAME}:{PORT}", new=2)

    try:
        webServer.serve_forever()
    except KeyboardInterrupt:
        pass

    webServer.server_close()
    print("Server stopped.")
