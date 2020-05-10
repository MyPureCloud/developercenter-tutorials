// Import json file that will be used later for creating objects.
const inputTemplate = require('./input-template.json');
// Set Genesys cloud objects
const client = platformClient.ApiClient.instance;
const platformClient = require('purecloud-platform-client-v2');
// Instantiate APIs
const AuthorizationApi = new platformClient.AuthorizationApi();
const telephonyProvidersEdgeApi = new platformClient.TelephonyProvidersEdgeApi();
const locationsApi = new platformClient.LocationsApi();

// Declare global variables
let locationInfo = null;
let siteId = null;

// Get client credentials from environment variables
const CLIENT_ID = inputTemplate.client_id;
const CLIENT_SECRET = inputTemplate.client_secret;

// Authenticate with genesys cloud
client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
    .then(() => {
        console.log('Authentication successful!');
        checkBYOC();
    })
    .catch((err) => console.log(err));

// Check if BYOC is in the list of enabled products
function checkBYOC() {
    AuthorizationApi.getAuthorizationProducts()
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
            console.log('Location Created!');
            locationInfo = data;
            getEdgeSite();
        })
        .catch((err) => {
            console.log('There was a failure calling postLocations');
            console.log(err);
        });
}

// This function will get details of 2 virtual Edges, assigned to an Edge Group and to a Site (created by default in your org).
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
            // Find default PureCloud Voice - AWS provider edge on the list
            const awsItem = data.entities.find((entitiesItem) => entitiesItem.name === 'PureCloud Voice - AWS');
            createSite(awsItem);
        })
        .catch((err) => {
            console.log('There was a failure calling getTelephonyProvidersEdgesSites');
            console.error(err);
        });
}

// Create site function, accepting the default default PureCloud Voice - AWS information
function createSite(awsItem) {
    // Format todays date to make default edgeAutoUpdateConfig start date and end date
    const today = new Date();
    const dateConfig = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const body = {
        name: inputTemplate.site.name, // Ex: My Site Name
        primarySites: [{
            id: awsItem.id,
            name: awsItem.name,
            selfUri: awsItem.selfUri,
        }],
        secondarySites: [{
            id: awsItem.id,
            name: awsItem.name,
            selfUri: awsItem.selfUri,
        }],
        edgeAutoUpdateConfig: {
            timeZone: inputTemplate.site.timeZone, // Ex: America/New_York
            rrule: 'FREQ=DAILY',
            start: `${dateConfig}T02:00:00.000`,
            end: `${dateConfig}T05:00:00.000`,
        },
        location: locationInfo,
        ntpSettings: {
            servers: [],
        },
    };

    telephonyProvidersEdgeApi.postTelephonyProvidersEdgesSites(body)
        .then((data) => {
            console.log(`postTelephonyProvidersEdgesSites success! data: ${JSON.stringify(data, null, 2)}`);
            console.log('Site Created!');
            siteId = data.id; // save site id as global id
            createTrunk();
        })
        .catch((err) => {
            console.log('There was a failure calling postTelephonyProvidersEdgesSites');
            console.error(err);
        });
}

// Create trunk using the credentials from config file.
function createTrunk() {
    const trunkBody = {
        name: inputTemplate.SipTrunk.ExternalTrunkName, // External Trunk Name
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
                    instance: [inputTemplate.SipTrunk.SipServers], // SIP Servers or Proxies
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
                    instance: inputTemplate.SipTrunk.instance, // BYOC signaling IP
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
                    instance: inputTemplate.SipTrunk.Realm, // Realm
                },
            },
            trunk_sip_authentication_credentials_username: {
                type: 'string',
                value: {
                    default: '',
                    instance: inputTemplate.SipTrunk.UserName, // User Name
                },
            },
            trunk_sip_authentication_credentials_password: {
                type: 'string',
                value: {
                    default: '',
                    instance: inputTemplate.SipTrunk.Password, // Password
                },
            },
            trunk_outboundIdentity_callingName: {
                type: 'string',
                pattern: '^[\\S ]{0,40}$',
                value: {
                    default: '',
                    instance: inputTemplate.SipTrunk.CallingName, // Calling Name
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
                    instance: inputTemplate.SipTrunk.Address, // Calling Address
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
                    instance: inputTemplate.SipTrunk.SipServers, // Inbound SIP Termination Identifier
                },
                required: false,
            },
        },
        trunkType: 'EXTERNAL',
    }; // Object | Trunk base settings

    telephonyProvidersEdgeApi.postTelephonyProvidersEdgesTrunkbasesettings(trunkBody)
        .then((data) => {
            console.log(`postTelephonyProvidersEdgesTrunkbasesettings success! data: ${JSON.stringify(data, null, 2)}`);
            console.log('Trunk was successfully created!');
            siteOutboundroutes(data);
        })
        .catch((err) => {
            console.log('There was a failure calling postTelephonyProvidersEdgesTrunkbasesettings');
            console.error(err);
        });
}

// Get list of Outbound Routes and delete it
function siteOutboundroutes(trunkData) {
    const opts = {
        pageSize: 25,
        pageNumber: 1,
    };
    telephonyProvidersEdgeApi.getTelephonyProvidersEdgesSiteOutboundroutes(siteId, opts)
        .then((data) => {
            const routeEntities = data.entities;
            // Delete default route
            routeEntities.forEach((entity) => {
                const entityId = entity.id;
                telephonyProvidersEdgeApi.deleteTelephonyProvidersEdgesOutboundroute(entityId)
                    .then((data) => {
                        console.log(`deleteTelephonyProvidersEdgesOutboundroute success! data: ${JSON.stringify(data, null, 2)}`);
                    })
                    .catch((err) => {
                        console.log('There was a failure calling getTelephonyProvidersEdgesSiteOutboundroutes');
                        console.error(err);
                    });
            });
            createOutboundRoute(trunkData);
        })
        .catch((err) => {
            console.log('There was a failure calling getTelephonyProvidersEdgesSiteOutboundroutes');
            console.error(err);
        });
}

// Set up outbound routes in the site created
function createOutboundRoute(trunkData) {
    const body = {
        name: 'My Outbound Route',
        classificationTypes: ['National', 'International'], // leveraged for outbound calls to national or international numbers
        enabled: true,
        distribution: '',
        externalTrunkBases: [{
            id: trunkData.id,
            name: trunkData.name,
            selfUri: trunkData.selfUri,
        }],
    };
    telephonyProvidersEdgeApi.postTelephonyProvidersEdgesSiteOutboundroutes(siteId, body)
        .then((data) => {
            console.log(`postTelephonyProvidersEdgesSiteOutboundroutes success! data: ${JSON.stringify(data, null, 2)}`);
            console.log('Outbound route created!');
            console.log('Process Completed!');
        })
        .catch((err) => {
            console.log('There was a failure calling postTelephonyProvidersEdgesSiteOutboundroutes');
            console.error(err);
        });
}
