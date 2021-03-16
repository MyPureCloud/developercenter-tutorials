import os
import PureCloudPlatformClientV2
from PureCloudPlatformClientV2.rest import ApiException

print('-----------------------------------------------------------------')
print('- Python3 Get Number of On-Queue Agents using Genesys Cloud SDK -')
print('-----------------------------------------------------------------')

# Set the Genesys Cloud environment
region = PureCloudPlatformClientV2.PureCloudRegionHosts.us_east_1
PureCloudPlatformClientV2.configuration.host = region.get_api_host()

# Authenticate with Genesys Cloud
apiClient = PureCloudPlatformClientV2.api_client.ApiClient() \
    .get_client_credentials_token(os.environ['GENESYS_CLOUD_CLIENT_ID'],
                                  os.environ['GENESYS_CLOUD_CLIENT_SECRET'])

# Create an instance of the Routing API and Analytics API
routing_api = PureCloudPlatformClientV2.RoutingApi(apiClient)
analytics_api = PureCloudPlatformClientV2.AnalyticsApi(apiClient)


def get_on_queue_agents(queue_name):
    """ Get number of agents active on a queue given the name of the queue.
    Args:
        queue_name (str): Name of the Queue.
    Returns:
        int: Number of agents 'on-queue'.
    """
    queue_id = 0
    on_queue_agents = 0

    # Search for the routing id of the queue
    try:
        api_response = routing_api.get_routing_queues(name=queue_name)

        # Check for the number of entities returned
        if len(api_response.entities) <= 0:
            print("Queue not found.")
            return -1
        elif len(api_response.entities) > 1:
            print("Found more than one queue with the name. Getting the first one.")
        else:
            # Get the id of the queue
            queue_id = api_response.entities[0].id

    except ApiException as e:
        print("Error on RoutingAPI -> " + str(e))

    # Count the 'on-queue' agents on the queue.
    try:
        # Build analytics query
        query = PureCloudPlatformClientV2.QueueObservationQuery()
        query.metrics = ['oOnQueueUsers']
        query.filter = PureCloudPlatformClientV2.ConversationAggregateQueryFilter()
        query.filter.type = 'or'
        query.filter.clauses = [PureCloudPlatformClientV2.ConversationAggregateQueryClause()]
        query.filter.clauses[0].type = 'or'
        query.filter.clauses[0].predicates = [PureCloudPlatformClientV2.ConversationAggregateQueryPredicate()]
        query.filter.clauses[0].predicates[0].dimension = 'queueId'
        query.filter.clauses[0].predicates[0].value = queue_id

        # Execute analytics query
        query_result = analytics_api.post_analytics_queues_observations_query(query)
        result_data = query_result.results[0].data
        on_queue_agents = result_data[0].stats.count if result_data else 0
    except ApiException as e:
        print("Error on RoutingAPI -> " + e.body)

    return on_queue_agents


if __name__ == "__main__":
    queue_name = input("Enter queue name: ")
    on_queue_agents = get_on_queue_agents(queue_name)
    print(f"Number of agents in \"{queue_name}\": {on_queue_agents}")
