// Set Genesys cloud objects
const platformClient = require('purecloud-platform-client-v2');
const client = platformClient.ApiClient.instance;

// Import library to use for input in NPM
const prompt = require('prompt');

// Get client credentials from environment variables
const CLIENT_ID = process.env.GENESYS_CLOUD_CLIENT_ID;
const CLIENT_SECRET = process.env.GENESYS_CLOUD_CLIENT_SECRET;
const ORG_REGION = process.env.GENESYS_CLOUD_REGION; // eg. us_east_1

// Instantiate API
let routingApi = new platformClient.RoutingApi();
let analyticsApi = new platformClient.AnalyticsApi();

// Declare global variables
let queueId = '';
let queueName = '';

// Properties of input
let schema = {
    properties: {
        queueName: {
            message: 'Name of queue',
            required: true
        }
    }
};

// Start the prompt
function inputQueueName() {
    return new Promise((resolve, reject) => {
        prompt.start();
        prompt.get(schema, (_err, result) => {
            if (_err) reject(err);

            resolve(result.queueName);
        });
    });
}

// Get Queue ID from name
function getQueueId(name){
    return routingApi.getRoutingQueues({
                pageSize: 100, pageNumber: 1, sortBy: 'name', name: queueName})
    .then((data) => {
        let queues = data.entities;

        if (queues.length < 1) {
            throw new Error('Queue not found.');
        } else if (queues.length > 1) {
            console.log('Found more than one queue with the name. Getting the first one.')
        }
            
        queueId = queues[0].id;
        console.log('queueId: ' + queueId);
    })
    .catch((err) => console.error(err));
}


// Get the number of on-queue agents
function getOnQueueAgentsCount() {
    let body = {
        filter: {
            type: 'or',
            clauses: [{
                type: 'or',
                predicates: [{
                    type: 'dimension',
                    dimension: 'queueId',
                    operator: 'matches',
                    value: queueId
                }]
            }]
        },
        metrics: [
            'oOnQueueUsers'
        ]
    }; 

    // Execute the analytics query. Count the 'on-queue' agents on the queue.
    return analyticsApi.postAnalyticsQueuesObservationsQuery(body)
    .then((data) => {
        let count = data.results[0].data?.[0].stats.count;
        if(!count) count = 0;
        
        return count;
    })
    .catch((err) => console.error(err));
}

// Set environment
const environment = platformClient.PureCloudRegionHosts[ORG_REGION];
if(environment) client.setEnvironment(environment);

client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
.then(() => {
    console.log('Authentication successful!');
    
    return inputQueueName();
})
.then((_queueName) => {
    queueName = _queueName;

    return getQueueId(queueName);
})
.then(() => {
    return getOnQueueAgentsCount();
})
.then((count) => {
    console.log(`Number of On-Queue Agents (${queueName}): ${count}`);
})
.catch((err) => console.log(err));
