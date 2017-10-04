import base64, json, requests
import PureCloudPlatformClientV2
from PureCloudPlatformClientV2.rest import ApiException

print('-------------------------------------------------------------')
print('- Python3 Get Number of On-Queue Agents using PureCloud SDK -')
print('-------------------------------------------------------------')

# Oauth Client Credentials
client_id = 'd3b70533-d806-4ff8-9f35-sample'
client_secret = 'o3q5E87GyLlB-D_hQ09Odaur2F_sample'
authorization = base64.b64encode(bytes(client_id + ':' + client_secret, 'ISO-8859-1')).decode('ascii')

# Prepare for POST /oauth/token request
request_headers = {
	'Authorization': 'Basic ' + authorization,
	'Content-Type': 'application/x-www-form-urlencoded'
}
request_body = {
	'grant_type': 'client_credentials'
}	

# Get token
response = requests.post('https://login.mypurecloud.com/oauth/token', data=request_body, headers=request_headers)

# Check response
if response.status_code == 200:
	print('Got token')
else:
	print('Failure: ' + str(response.status_code) + ' - ' + response.reason)
	sys.exit(response.status_code)
	
# Configure the token for use by the SDK
PureCloudPlatformClientV2.configuration.access_token = response.json()['access_token']

# Create an instance of the Routing API
routing_api = PureCloudPlatformClientV2.RoutingApi()

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