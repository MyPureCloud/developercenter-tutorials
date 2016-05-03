require 'rest-client'
require 'json'
require "base64"

secret = ENV['purecloud_secret']
id = ENV['purecloud_client_id']

basic = Base64.strict_encode64("#{id}:#{secret}")

tokenData = JSON.parse RestClient.post('https://login.mypurecloud.com/oauth/token',
                        {:grant_type => 'client_credentials'},
                        :Authorization => "Basic " + basic,
                        'content-type'=> 'application/x-www-form-urlencoded',
                        :accept => :json)


authHeader = tokenData["token_type"] + ' ' + tokenData["access_token"]

puts RestClient.get('https://api.mypurecloud.com/api/v2/authorization/roles',
                        :Authorization => authHeader,
                        :accept => :json)
