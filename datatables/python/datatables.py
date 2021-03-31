import sys, csv, ast, os
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print("-------------------------------------------------------------")
print("- Datatables -")
print("-------------------------------------------------------------")

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

# PureCloud Objects
architect_api = PureCloudPlatformClientV2.ArchitectApi(api_client)

datatable_schema = {
    'name': 'My DataTable',
    'description': 'A new table that will contain data.',
    'schema': {
        '$schema': 'http://json-schema.org/draft-04/schema#',
        'type': 'object',
        'additionalProperties': False,
        'properties': {
            'key': {
                'title': 'item_id',
                'type': 'string',
                '$id': '/properties/key'
            },
            'available': {
                'title': 'available',
                'type': 'boolean',
                '$id': '/properties/available',
                'default': False
            },
            'expiration': {
                'title': 'expiration',
                'type': 'integer',
                '$id': '/properties/expiration',
            },
            'price': {
                'title': 'price',
                'type': 'number',
                '$id': '/properties/price',
            },
            'description': {
                'title': 'description',
                'type': 'string',
                '$id': '/properties/description',
                'default': 'not available'
            }
        },
        'required': ['key']
    }
}

try:
    datatable = architect_api.post_flows_datatables(datatable_schema)
except ApiException as e:
    pprint("Exception when calling ArchitectApi->post_flows_datatables: %s\n" % e)
    sys.exit()

print("Successfully created table.")

# Add rows to the data table
with open('sample.csv') as csv_file:
    csv_reader = csv.reader(csv_file, delimiter=',')
    line_count = 0
    headers = {}
    # Parse the row and build the request body
    for row in csv_reader:
        if line_count == 0:
            headers = row
            line_count += 1
        else:
            print(row)
            body = {}
            for i in range(0, len(row)):
                # Convert value to expected type
                try:
                    val = ast.literal_eval(row[i])
                except ValueError:
                    val = row[i]
                except SyntaxError:
                    val = row[i]
                body[headers[i]] = val
            line_count += 1
            
            # Add the row
            try:
                architect_api.post_flows_datatable_rows(datatable.id, body)
            except ApiException as e:
                pprint("Exception when calling ArchitectApi->post_flows_datatable_rows: %s\n" % e)
                sys.exit()

print("Successfully added rows.")
