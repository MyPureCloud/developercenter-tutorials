from http.server import BaseHTTPRequestHandler, HTTPServer
import re, requests, webbrowser

HOST_NAME = "localhost"
PORT = 8080


class SampleServer(BaseHTTPRequestHandler):
    def do_GET(self):
        # Index page
        if self.path == "/":
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            with open("implicit.html", "rb") as htmlFile:
                self.wfile.write(htmlFile.read())
        # API endpoint to verify token /token/<token-here>
        elif self.path.startswith("/token/"):
            token = re.search("/token/(.+)", self.path).group(1)
            res = validate_token(token)

            self.send_response(res.status_code)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(bytes("{}", "utf-8"))
        else:
            self.send_response(404)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(bytes("<html><p> 404. Not found. </p></html>", "utf-8"))


def validate_token(token):
    # Prepare for GET /api/v2/authorization/roles request
    request_headers = {
        'Authorization': 'Bearer ' + token
    }

    # Get user
    response = requests.get('https://api.mypurecloud.com/api/v2/users/me', headers=request_headers)

    # Check response
    if response.status_code == 200:
        # Get JSON response body
        response_json = response.json()
        print('\n*** USER DATA ***')
        print('  id: ' + response_json['id'])
        print('  name: ' + response_json['name'])
        print('  email: ' + response_json['email'])
    else:
        print('Failure: ' + str(response.status_code) + ' - ' + response.reason)

    return response


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
