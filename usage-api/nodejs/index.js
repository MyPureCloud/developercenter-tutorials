// Variable declarations
require('dotenv').config();
let apiKey = process.env.APIKEY;
let appId = encodeURIComponent(process.env.APPID);
let request = require('request');

// Call the first function overallCustomerCount()
overallCustomerCount();

function overallCustomerCount() {
    let options = {
        'method': 'GET',
        'url': 'https://billable-vendor-usage-api.usw2.pure.cloud/v1/regions?appIds=' + appId,
        'headers': {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        }
    };
    request(options, function (error, response) { 
        if (error) throw new Error(error);
        console.log("--- OVERALL CUSTOMER COUNT ---");
        console.log(response.body);
        let bodyResponse = JSON.parse(response.body);
        for (i in bodyResponse.regions) {
            let regionId = bodyResponse.regions[i].id;
            let regionsOrgCnt = bodyResponse.regions[i].organizationCounts.ariaWFMIntegration;
            if (regionsOrgCnt != 0) {
                usagePerCustomerWithinRegion(regionId,regionsOrgCnt);
            }
        }
    });
}

function usagePerCustomerWithinRegion(regionId, OrgCnt) {
    let options = {
        'method': 'GET',
        'url': 'https://billable-vendor-usage-api.usw2.pure.cloud/v1/regions/' + regionId + '/organizations?appIds=' + appId,
        'headers': {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        }
    };
    request(options, function (error, response) { 
        if (error) throw new Error(error);
        console.log('--- CUSTOMER FROM REGION '+regionId+' ---')
        bodyResponse = JSON.parse(response.body)
        console.log(response.body);
        for (i=0;i<OrgCnt;i++) {
            orgId = bodyResponse.organizations[i].orgId;
            individualCustomerSubscription(regionId, orgId)
        }
    });
}

function individualCustomerSubscription(regionId, orgId) {
    let options = {
        'method': 'GET',
        'url': 'https://billable-vendor-usage-api.usw2.pure.cloud/v1/regions/' + regionId + '/organizations/' + orgId + '?appIds=' + appId,
        'headers': {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        }
    };
    request(options, function (error, response) { 
        if (error) throw new Error(error);
        console.log('--- SUBSCRIPTION FROM REGION '+regionId+', FROM ORG '+orgId+' ---')
        console.log(response.body);
    });
}