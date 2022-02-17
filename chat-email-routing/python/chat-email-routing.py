import base64, sys, requests
import asyncio
import websockets
import json
import os
import PureCloudPlatformClientV2
from pprint import pprint
from datetime import date
from PureCloudPlatformClientV2.rest import ApiException


print("-------------------------------------------------------------")
print("- Python3 3rd Party Chat and Email Routing -")
print("-------------------------------------------------------------")

QUEUE_ID = "QUEUE_ID"
PROVIDER_NAME = "Developer Center Tutorial"

# Credentials
CLIENT_ID = os.environ['GENESYS_CLOUD_CLIENT_ID']
CLIENT_SECRET = os.environ['GENESYS_CLOUD_CLIENT_SECRET']
ORG_REGION = os.environ['GENESYS_CLOUD_REGION']  # eg. us_east_1

# Set environment
region = PureCloudPlatformClientV2.PureCloudRegionHosts[ORG_REGION]
PureCloudPlatformClientV2.configuration.host = region.get_api_host()

# OAuth when using Client Credentials
api_client = PureCloudPlatformClientV2.api_client.ApiClient() \
            .get_client_credentials_token(CLIENT_ID, CLIENT_SECRET)

# Set Genesys Cloud Objects
notifications_api = PureCloudPlatformClientV2.NotificationsApi(api_client)
conversations_api = PureCloudPlatformClientV2.ConversationsApi(api_client)

try:
    # Create a new channel
    new_channel = notifications_api.post_notifications_channels()
    print("Created a channel")
except ApiException as e:
    print(f"Exception when calling NotificationsApi->post_notifications_channels: { e }")
    sys.exit(response.status_code)

conversations_topic_id = f"v2.routing.queues.{ QUEUE_ID }.conversations.emails"
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


async def email_conversation_wss():
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
                # Color text red if it matches this provider
                provider_text = message['eventBody']['participants'][0]['provider']
                if provider_text == PROVIDER_NAME:
                    provider_text = "\033[1;31;40m "+  provider_text + "\033[0;37;40m \n"

                # Log some info
                print("[{" + provider_text + "] id: " + message['eventBody']['id'] +
                      f"\n from: { message['eventBody']['participants'][0]['name'] } " +
                      f"\n < { message['eventBody']['participants'][0]['address'] } >")


async def create_email():
    """
    Creates a 3rd party email
    https://developer.mypurecloud.com/api/rest/v2/conversations/third-party-object-routing.html
    """
    email_request = PureCloudPlatformClientV2.CreateEmailRequest()
    email_request.queue_id = QUEUE_ID
    email_request.provider = PROVIDER_NAME
    email_request.to_address = "Developer Tutorial"
    email_request.to_name = "Developer Tutorial"
    email_request.from_address = "no-reply@mypurecloud.com"
    email_request.from_name = "John Doe"
    email_request.subject = "External system email"

    # 5 second delay before sending creating email conversation
    await asyncio.sleep(5)

    try:
        api_response = conversations_api.post_conversations_emails(email_request)
        print(f"Created email, conversation id: { api_response.id }")
    except ApiException as e:
        print(f"Exception when calling ConversationsApi->post_conversations_emails: {e}")


grouped_async = asyncio.gather(create_email(), email_conversation_wss())
asyncio.get_event_loop().run_until_complete(grouped_async)
