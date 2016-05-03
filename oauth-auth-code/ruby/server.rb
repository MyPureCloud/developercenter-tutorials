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

@@sessionMap = {}

@@client_id = 'efb6698a-5f76-4f90-bf29-9a69a3555602';
@@client_secret = '3pDfUuU1h8nK5XZigBp2ogc1GZkII4KvJKBmKqEGnt0';

class InspectValidationMiddleware

  def initialize(app)
    @app = app
  end

  def call(env)
    #if we don't have a session then redirect them to the login page
    req = Rack::Request.new(env)
    if(!@@sessionMap.has_key?(req.session["purecloudsession"]) &&
        !req.url.include?("oauth"))

        redirectUri = "https://login.mypurecloud.com/oauth/authorize?" +
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
  redirect to('/my_info.html')
end

get '/oauth2/callback' do
    authCode = params['code']

    tokenFormData = {
        "grant_type" => "authorization_code",
        "code" => authCode,
        "redirect_uri" => "http://localhost:8085/oauth2/callback"
    }

    tokenResponse =JSON.parse RestClient.post "https://#{@@client_id}:#{@@client_secret}@login.mypurecloud.com/oauth/token", tokenFormData

    puts "Access token " + tokenResponse['access_token'];
    sessionId = SecureRandom.uuid;
    @@sessionMap[sessionId] = tokenResponse['access_token'];
    session["purecloudsession"] = sessionId;

    redirect to('my_info.html')
end

get '/me' do
    authToken = @@sessionMap[session["purecloudsession"]];

    return RestClient.get 'https://api.mypurecloud.com/api/v2/users/me', {:Authorization => 'Bearer ' + authToken}

end
