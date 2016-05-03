require 'sinatra'
require "rest-client"
require 'json'

set :port, 8085

#this method will be called once we get our authentication token
def post_auth_method authToken
    #just get the current user's information and print it out to the console
    userInfo = RestClient.get('https://api.mypurecloud.com/api/v2/users/me', {:Authorization => 'Bearer ' + authToken})

    puts JSON.pretty_generate (JSON.parse(userInfo))

end

get '/oauth2/callback' do
    puts 'oauth callback'
    send_file 'implicit.html'
end

get '/token/:token' do
    puts 'got token'
    puts params['token']
    post_auth_method params['token']
    Thread.new { sleep 1; Process.kill 'INT', Process.pid }
end

#tossing this in a new thread and waiting a second so that we can make sure that sinatra is up and running
Thread.new {
  sleep(1)
  client_id = 'bfadf7a0-3364-4f65-9fda-00d37877113f';

  redirectUri = "https://login.mypurecloud.com/oauth/authorize?" +
              "response_type=token" +
              "&client_id=" + client_id +
              "&redirect_uri=http://localhost:8085/oauth2/callback";

  #osx only, need something different for windows
  `open http://localhost:8085/oauth2/callback`

}
