// Obtain a reference to the platformClient object
const platformClient = require('purecloud-platform-client-v2');
const parse = require('csv-parse');
const fs = require('fs');

const client = platformClient.ApiClient.instance;
const architectApi = new platformClient.ArchitectApi();

const csvFile = 'sample.csv';

const dataTableSchema = {
    'name': 'My DataTable',
    'description': 'A new table that will contain data.',
    'schema': {
        '$schema': 'http://json-schema.org/draft-04/schema#',
        'type': 'object',
        'additionalProperties': false,
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
                'default': false
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
};

/**
 * Create a new data table with the specified schema
 */
function createDataTable(){
    return architectApi.postFlowsDatatables(dataTableSchema)
        .then((dataTable) => {
            return dataTable;
        })
        .catch((err) => {
            console.log('There was a failure calling postFlowsDatatables');
            console.error(err);
        });
}

/**
 * Open the CSV and return the parsed contents
 */
function importFromCSV(){
    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFile).pipe(parse({ delimiter: ',' }, 
            (err, data) => {
                if(err){
                    console.log(`An error was encountered: ${err}`);
                    reject(err);
                }
                
                resolve(data);
            }));
    });
}

/**
 * Add rows to the data table
 */
function addRows(dataTableId){
    return importFromCSV().then((csvData) => {
        let promiseArr = [];
        
        // Get headers
        let headers = csvData[0];
        csvData.shift();

        // Add rows one by one
        csvData.forEach((row) => {
            let body = {}
            row.forEach((cell, i) => {
                let header = headers[i];
                body[header] = convertToType(cell, header);
            });

            promiseArr.push(architectApi.postFlowsDatatableRows(dataTableId, body));
        });

        return Promise.all(promiseArr);
    })
    .catch((err) => console.error(err));
}

/**
 * Utility function
 * Convert the cell value from the CSV to the expected column type
 */
function convertToType(val, header){
    let finalType = dataTableSchema.schema.properties[header].type;
    let finalVal = val;

    switch(finalType.toLowerCase()){
        case 'string':
            break;
        case 'boolean':
            finalVal = (val.toLowerCase() === 'true');
            break;
        case 'integer':
            finalVal = parseInt(val);
            break;
        case 'number':
            finalVal = parseFloat(val);
            break;
        default:
            throw new Error('Type could not be determined.');
    }

    return finalVal;
}

// Authenticate
// Get client credentials from environment variables
const CLIENT_ID = process.env.GENESYS_CLOUD_CLIENT_ID;
const CLIENT_SECRET = process.env.GENESYS_CLOUD_CLIENT_SECRET;
const ORG_REGION = process.env.GENESYS_CLOUD_REGION; // eg. us_east_1

// Set environment
const environment = platformClient.PureCloudRegionHosts[ORG_REGION];
if(environment) client.setEnvironment(environment);

client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
.then(()=> {
    return createDataTable();
})
.then((dataTable) => {
    console.log('Successfully created table.');

    addRows(dataTable.id);
})
.then(() => {
    console.log('Successfully added rows.');
})
.catch((err) => {
    console.log(err);
});
