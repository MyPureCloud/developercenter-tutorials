import base64, json, requests, os
import PureCloudPlatformClientV2
from PureCloudPlatformClientV2.rest import ApiException

print('-------------------------------------------------------------')
print('- Python3 Get Number of On-Queue Agents using PureCloud SDK -')
print('-------------------------------------------------------------')
	
# Configure the token for use by the SDK
apiClient = PureCloudPlatformClientV2.api_client.ApiClient().get_client_credentials_token(os.environ['PURECLOUD_CLIENT_ID'], os.environ['PURECLOUD_CLIENT_SECRET'])

# Create an instance of the Routing API
routing_api = PureCloudPlatformClientV2.RoutingApi(apiClient)

def get_on_queue_agents(queue_name):
	""" Get number of agents active on a queue given the name of the queue.
	Args:
		queueName (str): Name of the Queue.
	Returns:
		int: Number of agents 'on-queue'.
	"""
	queue_id = 0
	on_queue_agents = 0
	
	# Search for the routing id of the queue
	try:
		api_response = routing_api.get_routing_queues(name=queue_name)
		
		# Check for the number of entities returned
		if(len(api_response.entities) < 1):
			print("Queue not found.")
			return -1
		elif(len(api_response.entities) > 1):
			print("Found more than one queue with the name. Getting the first one.")
		else:
			# Get the id of the queue
			queue_id = api_response.entities[0].id
		
	except ApiException as e:
		print("Error on RoutingAPI -> " + e)
		
	# Count the 'on-queue' agents on the queue.
	try:
		api_response = routing_api.get_routing_queue_users(queue_id, 
			routing_status=["IDLE","INTERACTING"])
		on_queue_agents = api_response.total
	except ApiException as e:
		print("Error on RoutingAPI -> " + e)

	return on_queue_agents