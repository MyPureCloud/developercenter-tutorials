const platformClient = require('purecloud-platform-client-v2');
const prompt = require('prompt');

// Set Genesys Cloud objects
const client = platformClient.ApiClient.instance;

// Get client credentials from environment variables
const CLIENT_ID = process.env.GENESYS_CLOUD_CLIENT_ID;
const CLIENT_SECRET = process.env.GENESYS_CLOUD_CLIENT_SECRET;
const ORG_REGION = process.env.GENESYS_CLOUD_REGION; // eg. us_east_1

// Set environment
const environment = platformClient.PureCloudRegionHosts[ORG_REGION];
if(environment) client.setEnvironment(environment);

// Create API instances
const externalContactsApi = new platformClient.ExternalContactsApi();

let body = '';

// Properties of input
let schemaInput = {
    properties: {
        // Get customization type
        customization: {
            message: 'Customize contact types (C), customize organization types(O), delete custom contact/organization types(X)',
            required: true
        }
    }
};

// Start the prompt
prompt.start();
// OAuth input
prompt.get(schemaInput, function (_err, result) {
    client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
        .then(() => {
            let input = result.customization;
            if (input == 'C'){
                customizeContact()
            }
            else if (input == 'O'){
                customizeOrganization()
            }
            else if (input =='X'){
                deleteRecord()
            } 
        })

        .catch((err) => {
            // Handle failure response
            console.log(err);
        });
});

body = {
    name: 'Customized Contact', // Desired name for contact / organization
    version: 0,
    enabled: true,
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-04/schema#',
      title: 'Customized Contact', // Desired title
      description: 'created using external contacts', // Description for the custom contact / organization
      properties: {
        number_number: { // Field key for number. Take note that you can modify this e.g yourNumber_number
          allOf: [
            {
              $ref: '#/definitions/number'
            }
          ],
          title: 'Number', // Field label for number
          description: '', // Description for number
          maximum: 15,
          minimum: 0
        },
        dropdown_enum: { // Field key for dropdown. Take note that you can modify this e.g yourDropdown_enum
          allOf: [
            {
              $ref: '#/definitions/enum'
            }
          ],
          title: 'Dropdown', // Field label for dropdown
          description: '', // Description for dropdown
          'enum': [ // List of  display objects in dropdown menu
            '_1',
            '_2',
            '_3',
            '_4'
          ],
          _enumProperties: { // Corresponding properties for each dropdown
            _1: {
              title: '1', // Modify the title for each dropdown
              _disabled: false // Enable or disable each menu
            },
            _2: {
              title: '2',
              _disabled: false
            },
            _3: {
              title: '3',
              _disabled: false
            },
            _4: {
              title: '4',
              _disabled: false
            }
          }
        },
        text_languages_text: { // Field key for text. Take note that you can modify this e.g yourText_text
          allOf: [
            {
              $ref: '#/definitions/text'
            }
          ],
          title: 'Text', // Field label for text
          description: '', // Description for text
          maxLength: 100,
          minLength: 0
        },
        checkbox_checkbox: { // Field key for text. Take note that you can modify this e.g yourCheckbox_checkbox
          allOf: [
            {
              $ref: '#/definitions/checkbox'
            }
          ],
          title: 'Checkbox', // Field label for checkbox
          description: 'This is check box' // Description for checkbox
        },
        date_date: { // Field key for date. Take note that you can modify this e.g yourDate_date
          allOf: [
            {
              $ref: '#/definitions/date'
            }
          ],
          title: 'Date', // Field label for date
          description: '' // Description for date
        },
        date_and_time_datetime: { // Field key for date and time. Take note that you can modify this e.g yourDateandTime_datetime
          allOf: [
            {
              $ref: '#/definitions/datetime'
            }
          ],
          title: 'Date and Time', // Field label for date and time
          description: '' // Description for date and time
        },
        identifier_identifier: { // Field key for identifier. Take note that you can modify this e.g yourIdentifier_identifier
          allOf: [
            {
              $ref: '#/definitions/identifier'
            }
          ],
          title: 'Identifier', // Field label for identifier
          description: '', // Description for identifier
          maxLength: 100,
          minLength: 0
        },
        tag_tag: { // Field key for tag. Take note that you can modify this e.g yourTag_tag
          allOf: [
            {
              $ref: '#/definitions/tag'
            }
          ],
          title: 'Tag', // Field label for Tag
          description: '', // Description for tag
          maxItems: 10,
          minItems: 0,
          uniqueItems: true,
          items: {
            maxLength: 100,
            minLength: 1
          }
        },
        text_area_longtext: { // Field key for text area. Take note that you can modify this e.g yourText_longtext
          allOf: [
            {
              $ref: '#/definitions/longtext'
            }
          ],
          title: 'Text Area', // Field label for Text Area
          description: '', // Description for tag
          maxLength: 1000,
          minLength: 0
        },
        url_url: { // Field key for URL. Take note that you can modify this e.g yourUrl_url
          allOf: [
            {
              $ref: '#/definitions/url'
            }
          ],
          title: 'URL',
          description: '', // Description for URL
          maxLength: 200,
          minLength: 0
        }
      }
    }
  }// Object | query



// Add schema for contacts
function customizeContact () {
    externalContactsApi.postExternalcontactsContactsSchemas(body)
    .then((data) => {
      console.log(`postExternalcontactsContactsSchemas success! data: ${JSON.stringify(data, null, 2)}`);
    })
    .catch((err) => {
      console.log('There was a failure calling postExternalcontactsContactsSchemas');
      console.error(err);
    });
}

// Add schema for organization
function customizeOrganization() {
    externalContactsApi.postExternalcontactsOrganizationsSchemas(body)
    .then((data) => {
      console.log(`postExternalcontactsContactsSchemas success! data: ${JSON.stringify(data, null, 2)}`);
    })
    .catch((err) => {
      console.log('There was a failure calling postExternalcontactsContactsSchemas');
      console.error(err);
    });

}

// Delete schema for contact or organization 
function deleteRecord() {

    let schemaId = "70739a90-443c-42a3-a388-40b34728ed65"; // String | Schema ID

    externalContactsApi.deleteExternalcontactsContactsSchema(schemaId)
    .then(() => {
        console.log('deleteExternalcontactsContactsSchema returned successfully.');
    })
    .catch((err) => {
        console.log('There was a failure calling deleteExternalcontactsContactsSchema');
        console.error(err);
    });

}


