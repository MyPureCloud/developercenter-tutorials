require 'purecloud'

secret = ENV['purecloud_secret']
id = ENV['purecloud_client_id']

PureCloud.authenticate_with_client_credentials id, secret, "inindca.com"

conversationApi = PureCloud::ConversationsApi.new
callbackData = PureCloud::CreateCallbackCommand.new({
        :routingData => {
            :queueId => "6b156afe-b9c1-49b4-82f3-6dfa5409c71c"
        },
        :scriptId =>  "37c9f4e0-83f4-11e6-8f6e-a53d3e922867",
        :callbackUserName => "Tutorial Callback",
        :callbackNumbers => ["3172222222"],
        :data => {
            :customDataAttribute => "custom value"
        }
})


callbackResponseData = conversationApi.post_callbacks callbackData
puts callbackResponseData.inspect
