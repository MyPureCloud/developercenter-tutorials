import base64, sys, requests, time
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print('-------------------------------------------------------------')
print('- Execute Bulk Action on recordings-')
print('-------------------------------------------------------------')

# OAuth when using Client Credentials
client_id = 'CLIENT_ID'
client_secret = 'CLIENT_ID'

# Authenticate client
api_client = PureCloudPlatformClientV2.api_client.ApiClient().get_client_credentials_token(client_id, client_secret)

# Get the api
recording_api = PureCloudPlatformClientV2.RecordingApi(api_client)

access_token = recording_api.api_client.access_token

# Assign the token
PureCloudPlatformClientV2.configuration.access_token = access_token

# Build the create job query, for export action, set query.action = "EXPORT"
query = PureCloudPlatformClientV2.RecordingJobsQuery()
query.action = "DELETE"
query.action_date = "2029-01-01T00:00:00.000Z"
query.integration_id = "integration-id"
query.conversation_query = {
    "interval": "2019-01-01T00:00:00.000Z/2019-07-10T00:00:00.000Z",
    "order": "asc",
    "orderBy": "conversationStart"
}
print(query)
try:
    # Call create_recording_job api
    create_job_response = recording_api.post_recording_jobs(query)
    job_id = create_job_response.id
    print(f"Succesfully created recording bulk job { create_job_response}")
    print(job_id)
except ApiException as e:
    print(f"Exception when calling RecordingApi->post_recording_jobs: { e }")
    sys.exit()

# Call get_recording_job api
while True:
    try:
        get_recording_job_response = recording_api.get_recording_job(job_id)
        job_state = get_recording_job_response.state
        if job_state != 'PENDING':
            break
        else:
            time.sleep(2)
    except ApiException as e:
        print(f"Exception when calling RecordingApi->get_recording_job: { e }")
        sys.exit()

if job_state == 'READY':
    try:
        execute_job_response = recording_api.put_recording_job(job_id, { "state": "PROCESSING"})
        print(f"Succesfully execute recording bulk job { execute_job_response}")
    except ApiException as e:
        print(f"Exception when calling RecordingApi->put_recording_job: { e }")
        sys.exit()
else:
    print(f"Expected Job State is: READY, however actual Job State is: { job_state }")

# Call delete_recording_job api
# Can be canceled also in READY and PENDING states
if job_state == 'PROCESSING':
    try:
        cancel_job_response = recording_api.delete_recording_job(job_id)
        print(f"Succesfully cancel recording bulk job { execute_job_response}")
    except ApiException as e:
        print(f"Exception when calling RecordingApi->delete_recording_job: { e }")
        sys.exit()

try:
    get_recording_jobs_response = recording_api.get_recording_jobs({
        "page_size": 25,
        "page_number": 1,
        "sort_by": "userId",  # or "dateCreated"
        "state": "READY",  # valid values FULFILLED, PENDING, READY, PROCESSING, CANCELLED, FAILED
        "show_only_my_jobs": True,
        "job_type": "EXPORT",  # or "DELETE"
    })
    print(f"Succesfully get recording bulk jobs { execute_job_response}")
except ApiException as e:
    print(f"Exception when calling RecordingApi->get_recording_jobs: { e }")
    sys.exit()
