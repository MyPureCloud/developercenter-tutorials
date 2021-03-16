import base64, sys, requests, os
from datetime import datetime, timedelta
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException


def get_interval_string():
    """ Gets an ISO-8601 interval from now for the last 7 days """
    now = datetime.now().replace(microsecond=0)
    week_ago = (now - timedelta(days=7)).replace(microsecond=0)
    return f"{ week_ago.isoformat() }/{ now.isoformat() }"


print("-------------------------------------------------------------")
print("- Querying Queue Historical Statistics -")
print("-------------------------------------------------------------")

# OAuth when using Client Credentials
apiClient = PureCloudPlatformClientV2.api_client.ApiClient().get_client_credentials_token(os.environ['GENESYS_CLOUD_CLIENT_ID'], os.environ['GENESYS_CLOUD_CLIENT_SECRET'])

# Genesys Cloud Objects
routing_api = PureCloudPlatformClientV2.RoutingApi(apiClient)
analytics_api = PureCloudPlatformClientV2.AnalyticsApi(apiClient)

# Get "Support" queue by name
try:
    queue_data = routing_api.get_routing_queues(name='Support')
except ApiException as e:
    print("Exception when calling RoutingApi->get_routing_queues: {e}")
    sys.exit()

print(f"queueData: {queue_data}")

# Store queue ID
queue_id = queue_data.entities[0].id

# Build analytics query
query = PureCloudPlatformClientV2.ConversationAggregationQuery()
query.interval = get_interval_string()
query.group_by = ['queueId']
query.metrics = ['nOffered', 'tAnswered', 'tTalk']
query.filter = PureCloudPlatformClientV2.ConversationAggregateQueryFilter()
query.filter.type = 'and'
query.filter.clauses = [PureCloudPlatformClientV2.ConversationAggregateQueryClause()]
query.filter.clauses[0].type = 'or'
query.filter.clauses[0].predicates = [PureCloudPlatformClientV2.ConversationAggregateQueryPredicate()]
query.filter.clauses[0].predicates[0].dimension = 'queueId'
query.filter.clauses[0].predicates[0].value = queue_id

print(f"query: {query}")

# Execute analytics query
query_result = analytics_api.post_analytics_conversations_aggregates_query(query)

pprint(f"queryResult: {query_result}")
