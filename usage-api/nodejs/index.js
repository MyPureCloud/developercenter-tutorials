// Get variables needed from environment variables
require('dotenv').config();
let apiKey = process.env.APIKEY;
let contentType = 'application/json'
let appId = encodeURIComponent(process.env.APPID);
let region = encodeURIComponent(process.env.REGION);
let orgId = encodeURIComponent(process.env.ORGID);

let request = require('request');

// Function calls to different usage api
overallCustomerCount();
usagePerCustomerWithinRegion();
individualCustomerSubscription();

// Function to get the overall customer count 
function overallCustomerCount() {
    let options = {
        'method': 'GET',
        'url': 'https://billable-vendor-usage-api.usw2.pure.cloud/v1/regions?appIds=' + appId,
        'headers': {
            'Content-Type': contentType,
            'x-api-key': apiKey
        }
    };
    request(options, function (error, response) { 
        if (error) throw new Error(error);
        console.log("Return for overallCustomerCount() function:\n" + response.body);
    });
}

// Function to get the organization and the usage count per region
function usagePerCustomerWithinRegion() {
    let options = {
        'method': 'GET',
        'url': 'https://billable-vendor-usage-api.usw2.pure.cloud/v1/regions/' + region + '/organizations?appIds=' + appId,
        'headers': {
            'Content-Type': contentType,
            'x-api-key': apiKey
        }
    };
    request(options, function (error, response) { 
        if (error) throw new Error(error);
        console.log("Return for usagePerCustomerWithinRegion() function:\n" + response.body);
    });
}

// Function to get the subscription details of an organization
function individualCustomerSubscription() {
    let options = {
        'method': 'GET',
        'url': 'https://billable-vendor-usage-api.usw2.pure.cloud/v1/regions/' + region + '/organizations/' + orgId + '?appIds=' + appId,
        'headers': {
            'Content-Type': contentType,
            'x-api-key': apiKey
        }
    };
    request(options, function (error, response) { 
        if (error) throw new Error(error);
        console.log("Return for individualCustomerSubscription() function:\n" + response.body);
    });
}