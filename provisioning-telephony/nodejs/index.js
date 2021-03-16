// Import json file that will be used later for creating objects.
const inputTemplate = require('./input-template.json');
// Set Genesys cloud objects
const platformClient = require('purecloud-platform-client-v2');
const client = platformClient.ApiClient.instance;
// Instantiate APIs
const authorizationApi = new platformClient.AuthorizationApi();
const telephonyProvidersEdgeApi = new platformClient.TelephonyProvidersEdgeApi();
const locationsApi = new platformClient.LocationsApi();

// Declare global variables
let locationInfo = null;
let siteId = null;

// Get client credentials from environment variables
const CLIENT_ID = process.env.GENESYS_CLIENT_ID;
const CLIENT_SECRET = process.env.GENESYS_CLIENT_SECRET;

// Authenticate with Genesys cloud
client.loginClientCredentialsGrant(process.env.GENESYS_CLIENT_ID, process.env.GENESYS_CLIENT_SECRET)
    .then(() => {
        console.log('Authentication successful!');
        checkBYOC();
    })
    .catch((err) => console.log(err));

// Check if BYOC is in the list of enabled products
function checkBYOC() {
    authorizationApi.getAuthorizationProducts()
        .then((data) => {
            console.log(`getAuthorizationProducts success! data: ${JSON.stringify(data, null, 2)}`);
            if (data.entities.find((entity) => entity.id === 'byoc') != undefined) {
                console.log('Your account has BYOC capability!');
                createLocation();
            } else {
                console.log(`Your account don't have BYOC capability!`);
            }
        })
        .catch((err) => {
            console.log('There was a failure calling getAuthorizationProducts');
            console.error(err);
        });
}

// Create location function 
function createLocation() {
    const body = {
        name: inputTemplate.location.name, // ex: My Location Name
        emergencyNumber: {
            number: inputTemplate.location.number, // ex: +639XXXXXXXXX
            type: 'default',
        },
        address: {
            street1: inputTemplate.location.street1,
            city: inputTemplate.location.city,
            state: inputTemplate.location.state,
            zipcode: inputTemplate.location.zipcode,
            country: inputTemplate.location.country,
            countryFullName: inputTemplate.location.countryFullName,
        },
    };
    locationsApi.postLocations(body)
        .then((data) => {
            console.log(`postLocations success! data: ${JSON.stringify(data, null, 2)}`);
            console.log('Location successfully created!');
            locationInfo = data;
            getEdgeSite();
        })
        .catch((err) => {
            console.log('There was a failure calling postLocations');
            console.log(err);
        });
}

// This function will get the default Edge Group - Genesys Cloud Voice - AWS
function getEdgeSite() {
    const opts = {
        pageSize: 25,
        pageNumber: 1,
        sortBy: 'name',
        sortOrder: 'ASC',
    };
    // Get list of virtual edges
    telephonyProvidersEdgeApi.getTelephonyProvidersEdgesSites(opts)
        .then((data) => {
            console.log(`getTelephonyProvidersEdgesSites success! data: ${JSON.stringify(data, null, 2)}`);
            // Find default Genesys Cloud Voice - AWS provider edge on the list
            const awsItem = data.entities.find((entitiesItem) => entitiesItem.name === 'PureCloud Voice - AWS');
            createSite(awsItem);
        })
        .catch((err) => {
            console.log('There was a failure calling getTelephonyProvidersEdgesSites');
            console.error(err);
        });
}

// This function will create a site using the location value and edge group value saved to a variable earlier
function createSite(awsItem) {
    const today = new Date();
    let startTime = today.toISOString(today.setHours(10,0,0,0)).substring(0,23); // default value is 2AM
    let endTime =  today.toISOString(today.setHours(13,0,0,0)).substring(0,23); // default value is 5AM
    const body = {
        name: inputTemplate.site.name, // Ex: My Site Name
        primarySites: [{
            id: awsItem.id,
            selfUri: awsItem.selfUri,
        }],
        secondarySites: [{
            id: awsItem.id,
            selfUri: awsItem.selfUri,
        }],
        edgeAutoUpdateConfig: {
            timeZone: inputTemplate.site.timeZone, // Ex: America/New_York
            rrule: 'FREQ=DAILY',
            start: startTime,   // Start and end date time is represented as an ISO-8601 string without a timezone. 
            end: endTime        // Example: yyyy-MM-ddTHH:mm:ss.SSS
        },
        location: locationInfo,
        ntpSettings: {
            servers: [],
        },
        mediaModel: "Cloud" // Allowable values are: Premises, Cloud
    };

    telephonyProvidersEdgeApi.postTelephonyProvidersEdgesSites(body)
        .then((data) => {
            console.log(`postTelephonyProvidersEdgesSites success! data: ${JSON.stringify(data, null, 2)}`);
            console.log('Site successfully created!');
            siteId = data.id; // Save site id as global id
            createTrunk();
        })
        .catch((err) => {
            console.log('There was a failure calling postTelephonyProvidersEdgesSites');
            console.error(err);
        });
}

// Create trunk using the credentials from input-template file.
function createTrunk() {
    const trunkBody = {
        name: inputTemplate.sipTrunk.externalTrunkName, // External Trunk Name
        state: 'active',
        trunkMetabase: {
            id: 'external_sip_pcv_byoc_carrier.json',
            name: 'Generic BYOC Carrier',
        },
        properties: {
            trunk_type: {
                type: 'string',
                value: {
                    default: 'external.pcv.byoc.carrier',
                    instance: 'external.pcv.byoc.carrier',
                },
            },
            trunk_label: {
                type: 'string',
                value: {
                    default: 'Generic BYOC Carrier',
                    instance: 'Sample Trunk',
                },
            },
            trunk_enabled: {
                type: 'boolean',
                value: {
                    default: true,
                    instance: true,
                },
            },
            trunk_transport_serverProxyList: {
                type: 'array',
                items: {
                    type: 'string',
                },
                uniqueItems: true,
                value: {
                    default: null,
                    instance: [inputTemplate.sipTrunk.sipServers], // SIP Servers or Proxies
                },
                required: true,
            },
            trunk_access_acl_allowList: {
                type: 'array',
                items: {
                    type: 'string',
                },
                value: {
                    default: [],
                    instance: inputTemplate.sipTrunk.instance, // BYOC signaling IP
                },
            },
            trunk_protocol: {
                type: 'string',
                enum: ['SIP'],
                value: {
                    default: 'SIP',
                    instance: 'SIP',
                },
            },
            trunk_sip_authentication_credentials_realm: {
                type: 'string',
                value: {
                    default: '',
                    instance: inputTemplate.sipTrunk.realm, // Realm
                },
            },
            trunk_sip_authentication_credentials_username: {
                type: 'string',
                value: {
                    default: '',
                    instance: inputTemplate.sipTrunk.userName, // User Name
                },
            },
            trunk_sip_authentication_credentials_password: {
                type: 'string',
                value: {
                    default: '',
                    instance: inputTemplate.sipTrunk.password, // Password
                },
            },
            trunk_outboundIdentity_callingName: {
                type: 'string',
                pattern: '^[\\S ]{0,40}$',
                value: {
                    default: '',
                    instance: inputTemplate.sipTrunk.callingName, // Calling Name
                },
            },
            trunk_outboundIdentity_callingName_overrideMethod: {
                type: 'string',
                enum: ['Always', 'Unassigned DID'],
                value: {
                    default: 'Always',
                    instance: 'Always',
                },
            },
            trunk_outboundIdentity_callingAddress: {
                type: 'string',
                value: {
                    default: '',
                    instance: inputTemplate.sipTrunk.address, // Calling Address
                },
            },
            trunk_outboundIdentity_callingAddress_overrideMethod: {
                type: 'string',
                enum: ['Always', 'Unassigned DID'],
                value: {
                    default: 'Always',
                    instance: 'Always',
                },
            },
            trunk_outboundIdentity_calledAddress_omitPlusPrefix: {
                type: 'boolean',
                value: {
                    default: false,
                    instance: false,
                },
            },
            trunk_outboundIdentity_callingAddress_omitPlusPrefix: {
                type: 'boolean',
                value: {
                    default: false,
                    instance: false,
                },
            },
            trunk_sip_termination_uri: {
                type: 'string',
                value: {
                    instance: inputTemplate.sipTrunk.sipServers, // Inbound SIP Termination Identifier
                },
                required: false,
            },
        },
        trunkType: 'EXTERNAL',
    }; // Object | Trunk base settings

    telephonyProvidersEdgeApi.postTelephonyProvidersEdgesTrunkbasesettings(trunkBody)
        .then((data) => {
            console.log(`postTelephonyProvidersEdgesTrunkbasesettings success! data: ${JSON.stringify(data, null, 2)}`);
            console.log('Trunk successfully created!');
            siteOutboundRoutes(data);
        })
        .catch((err) => {
            console.log('There was a failure calling postTelephonyProvidersEdgesTrunkbasesettings');
            console.error(err);
        });
}

// Find the default outbound route of the site previously created, then save the ID reference
function siteOutboundRoutes(trunkData) {
    const opts = {
        pageSize: 25,
        pageNumber: 1,
    };
    telephonyProvidersEdgeApi.getTelephonyProvidersEdgesSiteOutboundroutes(siteId, opts)
        .then((data) => {
            let outboundRouteId = data.entities[0].id;
            updateOutboundRoute(trunkData, outboundRouteId);
        })
        .catch((err) => {
            console.log('There was a failure calling getTelephonyProvidersEdgesSiteOutboundroutes');
            console.error(err);
        });
}

// Update default outbound routes in the site created
function updateOutboundRoute(trunkData, outboundRouteId) {
    const body = {
        name: 'Default Outbound Route',
        classificationTypes: [
            'National',
            'International',
        ], // leveraged for outbound calls to national or international numbers
        enabled: true, // make sure the outbound route is enabled
        externalTrunkBases: [{
            id: trunkData.id,
            name: trunkData.name,
            selfUri: trunkData.selfUri,
        }],
    };
    telephonyProvidersEdgeApi.putTelephonyProvidersEdgesSiteOutboundroute(siteId, outboundRouteId, body)
        .then((data) => {
            console.log(`putTelephonyProvidersEdgesSiteOutboundroutes success! data: ${JSON.stringify(data, null, 2)}`);
            console.log('Outbound route updated!');
            console.log('Process completed!');
        })
        .catch((err) => {
            console.log('There was a failure calling putTelephonyProvidersEdgesSiteOutboundroutes');
            console.error(err);
        });
}