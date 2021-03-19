// Set Genesys cloud objects
const platformClient = require('purecloud-platform-client-v2');
const client = platformClient.ApiClient.instance;

// Import library to use for input in NPM
const prompt = require('prompt');

// Get client credentials from environment variables
const CLIENT_ID = process.env.GENESYS_CLIENT_ID;
const CLIENT_SECRET = process.env.GENESYS_CLIENT_SECRET;

// Instantiate API
let routingApi = new platformClient.RoutingApi();

// Declare global variables
let queueId = "";
let queueName = "";


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
function inputQueue() {
  prompt.start();
  prompt.get(schema, function (_err, result) {
    queueName = result.queueName
    listQueues(queueName)
  });
}

// Display all the queues in the org base on the parameters
function listQueues(queueName) {
  let opts = {
    'pageSize': 100, // Number | Page size
    'pageNumber': 1, // Number | Page number
    'sortBy': "name", // String | Sort by
    'name': queueName // String | Name
  };

  routingApi.getRoutingQueues(opts)
    .then((routingQueuesData) => {
      console.log(`getRoutingQueues success! data: ${JSON.stringify(routingQueuesData, null, 2)}`);
      checkEntities(routingQueuesData);
    })
    .catch((err) => {
      console.log('There was a failure calling getRoutingQueues');
      console.error(err);
    });

}

// Check for the number of entities returned and Search for the routing id of the queue
function checkEntities(routingQueuesData) {

  if ((routingQueuesData.entities).length < 1) {
    console.log("Queue not found.")
  } else if ((routingQueuesData.entities).length > 1) {
    console.log("Found more than one queue with the name. Getting the first one.")
  } else {
    queueId = routingQueuesData.entities[0].id, 
    console.log("queueId: " + queueId), 
    postAnalyticsQueues()
  }

}

// Execute post analytics query base on the given values
function postAnalyticsQueues() {
  let body = {
    filter: {
      type: "or",
      clauses: [{
        type: "or",
        predicates: [{
          type: "dimension",
          dimension: "queueId",
          operator: "matches",
          value: queueId
        }]
      }]
    },
    metrics: [
      "oOnQueueUsers"
    ]
  }; // Object | query

  // Execute the analytics query. Count the 'on-queue' agents on the queue.
  routingApi.postAnalyticsQueuesObservationsQuery(body)
    .then((onQueueAgents) => {
      console.log(` Number of agents in ${queueName} : ${JSON.stringify(onQueueAgents.results[0].data[0].stats.count)}`)
    })
    .catch((err) => {

      if(onQueueAgents.results[0].data[0].stats.count ==0){
        console.log("There's no available agents on queue")
      }
      else{
        console.log('There was a failure calling postAnalyticsQueuesObservationsQuery');
        console.error(err);
      }
      
    });
}

// Authenticate with genesys cloud
client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('Authentication successful!');
    inputQueue();
  })
  .catch((err) => console.log(err));