import sys
import asyncio
import time
import os
import json
import websockets
import PureCloudPlatformClientV2
from pprint import pprint
from datetime import date
from PureCloudPlatformClientV2.rest import ApiException
from PureCloudPlatformClientV2.models import response

print("-------------------------------------------------------------")
print("- Realtime Queues Member Analytics -")
print("-------------------------------------------------------------")

# outhenticate with Genesys Cloud
apiClient = PureCloudPlatformClientV2.api_client.ApiClient() \
            .get_client_credentials_token(os.environ['LIENT_ID'], 
            os.environ['CLIENT_SECRET'])

# create an instance of the API class
api_instance = PureCloudPlatformClientV2.AnalyticsApi(apiClient)
notifications_api = PureCloudPlatformClientV2.NotificationsApi(apiClient)

QUEUE_ID = "QUEUE_ID"

try:
    # Create a new channel
    new_channel = notifications_api.post_notifications_channels()
    print("Created a channel")
except ApiException as e:
    print(f"Exception when calling NotificationsApi->post_notifications_channels: { e }")
    sys.exit(response.status_code)

conversations_topic_id = f"v2.routing.queues.{ QUEUE_ID }.conversations"
channel_topic = PureCloudPlatformClientV2.ChannelTopic()
channel_topic.id = conversations_topic_id

try:
    # Subscribe to conversation notifications for the queue
    notification_subscription = notifications_api.\
        put_notifications_channel_subscriptions(new_channel.id, [channel_topic])
    pprint(notification_subscription)
except ApiException as e:
    print(f"Exception when calling NotificationsApi->put_notifications_channel_subscriptions: { e }")
    sys.exit(response.status_code)

async def listen_to_Websocket():
    """ Open a new web socket using the connect Uri of the channel """
    async with websockets.connect(new_channel.connect_uri) as websocket:
        print("Listening to websocket")
        """ Message received """
        async for message in websocket:
            message = json.loads(message)
            if message['topicName'].lower() == "channel.metadata":
                print(f"Heartbeat: { date.today() }")
            elif message['topicName'].lower() != conversations_topic_id:
                print("Unexpected notification:")
                pprint(message)
            else:
                # on incoming calls from customer call diplay display_queue_observation function
                purpose = message['eventBody']['participants'][0]['purpose']
                if purpose == 'customer':
                    display_queue_observation()

def display_queue_observation():
    query = PureCloudPlatformClientV2.QueueObservationQuery() # QueueObservationQuery | query
    query.filter = {
        "type": "OR",
            "clauses": [
                {
                    "type": "or",
                        "predicates":[
                            {
                                "dimension" : "queueId",
                                "value": QUEUE_ID
                            }
                        ]
                }
            ]
        }
    query.metrics = ["oUserRoutingStatuses"]

    try:
        # Query for queue observations
        api_response = api_instance.post_analytics_queues_observations_query(query)
        print("Display analytics observation query.")
        pprint(api_response)
    except ApiException as e:
        print ("Exception when calling AnalyticsApi->post_analytics_queues_observations_query: %s\n" % e)

grouped_async = asyncio.gather(listen_to_Websocket())
asyncio.get_event_loop().run_until_complete(grouped_async)