require 'purecloudplatformclientv2'
require 'json'

secret = ENV['PURECLOUD_SECRET']
id = ENV['PURECLOUD_CLIENT_ID']

PureCloud.authenticate_with_client_credentials id, secret, "mypurecloud.com"
#PureCloud.configure.debugging = true

def get_queue_id
    #Grab the queue named Support
    routing_api = PureCloud::RoutingApi.new
    queues = routing_api.get_queues :name => "Support"
    queueId = queues.entities[0].id;
end

def get_interval_string
    startTime = DateTime.now.new_offset(0)
    endTime = startTime - 7

    #"2015-11-10T00:00:00.000Z/2015-11-11T00:00:00.000Z"
    intervalString = "#{endTime.strftime("%FT%R")}:00.000Z/#{startTime.strftime("%FT%R")}:00.000Z"
end

def create_query
    PureCloud::AggregationQuery.new({
            :interval => get_interval_string,
            :groupBy =>  ["queueId"],
            :metrics => ["nOffered","tAnswered","tTalk"],
            :filter => {
               :type=> "and",
               :clauses=> [
                 {
                   :type=> "or",
                   :predicates=> [
                     {
                       :dimension=> "queueId",
                       :value=> get_queue_id
                     }
                   ]
                 }
               ]
            }
    })
end

analytics_api = PureCloud::AnalyticsApi.new
result = analytics_api.post_analytics_conversations_aggregates_query :body=> create_query

puts result
