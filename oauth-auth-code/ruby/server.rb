require 'sinatra'
require "net/http"
require "uri"
require "rest-client"
require 'securerandom'
require 'json'

#configure sinatra
set :public_folder, File.dirname(__FILE__)
set :port, 8085
enable :sessions

@@client_id = 'bfadf7a0-3364-4f65-9fda-00d37877113f';
@@client_secret = 'my-client-secret';

@@sessionMap = {}
class InspectValidationMiddleware

  def initialize(app)
    @app = app
  end

  def call(env)
    #if we don't have a session then redirect them to the login page
    req = Rack::Request.new(env)
    if(!@@sessionMap.has_key?(session["purecloudsession"]) &&
        !req.url.include?("oauth"))

        redirectUri = "https://login.inindca.com/authorize?" +
                    "response_type=code" +
                    "&client_id=" + @@client_id +
                    "&redirect_uri=http://localhost:8085/oauth2/callback";

        puts "redirecting to #{redirectUri}"

        return [301, {'Location' => redirectUri, 'Content-Type' => 'text/html', 'Content-Length' => '0'}, []]

    end

    puts "Get page #{req.url}"

    @app.call(env)
  end
end

use InspectValidationMiddleware

get '/' do
  redirect to('/auth_code.html')
end

get '/oauth2/callback' do
    authCode = params['code']

    tokenFormData = {
        "grant_type" => "authorization_code",
        "code" => authCode,
        "redirect_uri" => "http://localhost:8085/oauth2/callback"
    }

    tokenResponse =JSON.parse RestClient.post "https://#{@@client_id}:#{@@client_secret}@login.inindca.com/token", tokenFormData

    puts "Access token " + tokenResponse['access_token'];
    sessionId = SecureRandom.uuid;
    @@sessionMap[sessionId] = tokenResponse['access_token'];
    session["purecloudsession"] = sessionId;

    redirect to('auth_code.html')
end

get '/me' do
    authToken = @@sessionMap[session["purecloudsession"]];

    return RestClient.get 'https://api.inindca.com/api/v1/users/me', {:Authorization => 'Bearer ' + authToken}

end
