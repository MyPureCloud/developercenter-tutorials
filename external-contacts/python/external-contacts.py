import base64, csv, sys, requests, os
import PureCloudPlatformClientV2
from pprint import pprint
from PureCloudPlatformClientV2.rest import ApiException

print('-------------------------------------------------------------')
print('- Python3 External Contacts -')
print('-------------------------------------------------------------')

# OAuth when using Client Credentials
apiclient = PureCloudPlatformClientV2.api_client.ApiClient().get_client_credentials_token(os.environ['PURECLOUD_CLIENT_ID'], os.environ['PURECLOUD_CLIENT_SECRET'])

# Create an instance of the External Contacts API API
external_contacts_api = PureCloudPlatformClientV2.ExternalContactsApi(apiclient)

# Define a new External Organization
new_org = PureCloudPlatformClientV2.ExternalOrganization()
new_org.name = "Developer Tutorial Company"
new_org.industry = "Software"
new_org.address = PureCloudPlatformClientV2.ContactAddress()
new_org.address.address1 = "601 Interactive Way"
new_org.address.city = "Indianapolis"
new_org.address.state = "Indiana"
new_org.address.postalCode = "46278"
new_org.address.countryCode = "USA"
new_org.employee_count = 2000
new_org.websites = ["https://developer.mypurecloud.com"]
new_org.twitter_id = PureCloudPlatformClientV2.TwitterId()
new_org.twitter_id.screen_name = 'PureCloud_dev'

try:
    # Create an external organization
    new_org_response = external_contacts_api.post_externalcontacts_organizations(new_org)
    org_id = new_org_response.id
    print(f"Created organization {org_id}")
except ApiException as e:
    print("Exception when calling ExternalContactsApi->post_externalcontacts_organizations: %s\n" % e)
    sys.exit()

# Loop through the CSV file and add each contact
with open("contacts.csv", mode="r", encoding='utf-8-sig') as csv_file:
    csv_reader = csv.DictReader(csv_file)

    print("Adding contacts...")
    for row in csv_reader:
        new_contact = PureCloudPlatformClientV2.ExternalContact()
        new_contact.first_name = row["GivenName"]
        new_contact.last_name = row["Surname"]
        new_contact.title = row["Title"]
        new_contact.work_phone = PureCloudPlatformClientV2.PhoneNumber()
        new_contact.work_phone.display = row["TelephoneNumber"]
        new_contact.address = PureCloudPlatformClientV2.ContactAddress()
        new_contact.address.address1 = row["StreetAddress"]
        new_contact.address.city = row["City"]
        new_contact.address.postal_code = row["ZipCode"]
        new_contact.work_email = row["EmailAddress"]
        new_contact.external_organization = new_org_response

        try:
            # Create an external contact
            api_response = external_contacts_api.post_externalcontacts_contacts(new_contact)
            pprint(api_response)
        except ApiException as e:
            print(f"Error occurred when adding {new_contact.first_name}")

    print("All contacts added.")
    