import base64, sys, requests
import asyncio
import websockets
import json
import PureCloudPlatformClientV2
from pprint import pprint
from datetime import date
from PureCloudPlatformClientV2.rest import ApiException


print("-------------------------------------------------------------")
print("- Python3 3rd Party Chat and Email Routing -")
print("-------------------------------------------------------------")

QUEUE_ID = "QUEUE_ID"
PROVIDER_NAME = "Developer Center Tutorial"

# Set PureCloud Objects
notifications_api = PureCloudPlatformClientV2.NotificationsApi()
conversations_api = PureCloudPlatformClientV2.ConversationsApi()

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

# Assign the token
PureCloudPlatformClientV2.configuration.access_token = response.json()["access_token"]

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
        print(f"Exception when calling ConversationsApi->post_conversations_emails: { e }")


grouped_async = asyncio.gather(create_email(), email_conversation_wss())
asyncio.get_event_loop().run_until_complete(grouped_async)
