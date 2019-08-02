import base64, sys, requests
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

# PureCloud Objects
routing_api = PureCloudPlatformClientV2.RoutingApi()
analytics_api = PureCloudPlatformClientV2.AnalyticsApi()

# OAuth when using Client Credentials
client_id = "CLIENT_ID"
client_secret = "CLIENT_SECRET"
authorization = base64.b64encode(bytes(client_id + ":" + client_secret, "ISO-8859-1")).decode("ascii")

# Prepare for POST /oauth/token request
request_headers = {
    "Authorization": f"Basic {authorization}",
    "Content-Type": "application/x-www-form-urlencoded"
}
request_body = {
    "grant_type": "client_credentials"
}

# Get token
response = requests.post("https://login.mypurecloud.com/oauth/token", data=request_body, headers=request_headers)

# Check response
if response.status_code == 200:
    print("Got token")
else:
    print(f"Failure: { str(response.status_code) } - { response.reason }")
    sys.exit(response.status_code)

access_token = response.json()["access_token"]

# Assign the token
PureCloudPlatformClientV2.configuration.access_token = access_token

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
query = PureCloudPlatformClientV2.AggregationQuery()
query.interval = get_interval_string()
query.group_by = ['queueId']
query.metrics = ['nOffered', 'tAnswered', 'tTalk']
query.filter = PureCloudPlatformClientV2.AnalyticsQueryFilter()
query.filter.type = 'and'
query.filter.clauses = [PureCloudPlatformClientV2.AnalyticsQueryClause()]
query.filter.clauses[0].type = 'or'
query.filter.clauses[0].predicates = [PureCloudPlatformClientV2.AnalyticsQueryPredicate()]
query.filter.clauses[0].predicates[0].dimension = 'queueId'
query.filter.clauses[0].predicates[0].value = queue_id

print(f"query: {query}")

# Execute analytics query
query_result = analytics_api.post_analytics_conversations_aggregates_query(query)

pprint(f"queryResult: {query_result}")
