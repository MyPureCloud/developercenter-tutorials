const axios = require('axios');

const apiKey = process.env.APIKEY;
const appId = encodeURIComponent(process.env.APPID);

/**
 * Get summary of all regions and the number of orgs
 * with the premium app.
 * @returns {Promise}
 */
function getRegionSummaries() {
    return axios.get(`https://billable-vendor-usage-api.usw2.pure.cloud/v1/regions?appIds=${appId}`, {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        }
    })
    .then((res) => {
        let data = res.data;

        console.log(`--- OVERALL CUSTOMER COUNT ---`);
        console.log(data);

        return data;
    })
    .catch(e => console.error(e));
}

/**
 * Get summary of all organizations within a region
 * and the usage quantity for each.
 * @param {String} regionId eg. us-east-1
 * @returns {Promise} Response from endpoint
 */
function getCustomersWithinRegion(regionId) {
    return axios.get(`https://billable-vendor-usage-api.usw2.pure.cloud/v1/regions/${regionId}/organizations?appIds=${appId}`, {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        }
    })
    .then((res) => {
        let data = res.data;

        console.log(`--- CUSTOMERS FROM REGION ${regionId} ---`);
        console.log(data);

        return data;
    })
    .catch(e => console.error(e));
}

/**
 * Prints the detailed info on a premium app subscription for a
 * specific org.
 * @param {String} regionId eg us-east-1
 * @param {String} orgId Genesys Cloud org id
 * @returns {Promise}
 */
function printOrgSubscription(regionId, orgId) {
    return axios.get(`https://billable-vendor-usage-api.usw2.pure.cloud/v1/regions/${regionId}/organizations/${orgId}?appIds=${appId}`, {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        }
    })
    .then((res) => {
        let data = res.data;

        console.log(`--- SUBSCRIPTION FROM REGION ${regionId}, FROM ORG ${orgId} ---`);
        console.log(data);

        return data;
    })
    .catch(e => console.error(e));
}



// Run all the functions in series.
// (Will print all subscription info of all orgs from all regions)
getRegionSummaries()
.then((data) => {
    let regionPromisesArr = [];

    // Get all customers through all the regions
    for (let region of data.regions) {
        regionPromisesArr.push(getCustomersWithinRegion(region.id));
    }

    return Promise.all(regionPromisesArr);
})
.then((allRegionsData) => {
    let allOrgsPromiseArr = [];

    // Go customer orgs per region
    for(let regionData of allRegionsData){
        let organizations = regionData.organizations;

        // Get subscription info from the org
        organizations.forEach(org => {
            allOrgsPromiseArr.push(printOrgSubscription(regionId, org.orgId));
        })
    }   
    
    return Promise.all(allOrgsPromiseArr);
})
.then(() => {
    // After all org subscription has been printed
    console.log('--- DONE ---');
})
.catch((e) => console.error(e));
