require 'purecloud'

secret = 'RnT-yKT2hQHjWCnX6JPg0OnQdJYeyCNnqtIx0NgWlpU' #ENV['purecloud_secret']
id = '08c0f624-c2b3-4f8c-bf3c-3b810ce777cf' # ENV['purecloud_client_id']

PureCloud.authenticate_with_client_credentials id, secret, "inindca.com"
#PureCloud.configure.debugging = true

def get_queue_id
    #for the purposes of this example, just grab the first queue
    routing_api = PureCloud::RoutingApi.new
    queues = routing_api.get_queues
    "c6fc6f57-4c1e-4812-980a-5154f500b5c6" #queueId = queues.entities[0].id;
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
result = analytics_api.post_conversations_aggregates_query :body=> create_query

require 'json'
puts result
