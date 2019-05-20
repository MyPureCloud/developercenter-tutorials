/*
*   NOTE: This sample uses ES6 features
*/
import appConfig from '../../config/config.js';

// JQuery Alias
const $ = window.$;

// Relative path to wizard page from config's redirectUri
const WIZARD_PAGE = "wizard/index.html";

/**
 * WizardApp class that handles everything in the App.
 */
class WizardApp {
    constructor(){
        // Reference to the PureCloud App (Client App SDK)
        this.pcApp = null;

        // PureCloud Javascript SDK clients
        this.platformClient = require('platformClient');
        this.purecloudClient = this.platformClient.ApiClient.instance;
        this.purecloudClient.setPersistSettings(true, 'premium_app');
        this.redirectUri = appConfig.redirectUriBase + WIZARD_PAGE;

        // PureCloud API instances
        this.usersApi = new this.platformClient.UsersApi();
        this.integrationsApi = new this.platformClient.IntegrationsApi();
        this.groupsApi = new this.platformClient.GroupsApi();
        this.authApi = new this.platformClient.AuthorizationApi();
        this.oAuthApi = new this.platformClient.OAuthApi();

        // Language default is english
        // Language context is object containing the translations
        this.language = appConfig.defaultLangTag;

        // PureCloud app name
        this.appName = appConfig.appName;

        this.prefix = appConfig.prefix;
        this.installationData = appConfig.provisioningInfo;
    }

    /**
     * Get details of the current user
     * @return {Promise.<Object>} PureCloud User data
     */
    getUserDetails(){
        let opts = {'expand': ['authorization']};
    
        return this.usersApi.getUsersMe(opts);
    }

    /**
     * Checks if the product is available in the current Purecloud org.
     * @return {Promise.<Boolean>}
     */
    validateProductAvailability(){
        // premium-app-example         
        return this.integrationsApi.getIntegrationsTypes({})
        .then((data) => {
            if (data.entities.filter((integType) => integType.id === this.appName)[0]){
                console.log("PRODUCT AVAILABLE");
                return(true);
            } else {
                console.log("PRODUCT NOT AVAILABLE");
                return(false);
            }
        });
    }

    /**
     * Checks if any configured objects are still existing. 
     * This is based on the prefix
     * @returns {Promise.<Boolean>} If any installed objects are still existing in the org. 
     */
    isExisting(){
        let promiseArr = []; 
        
        promiseArr.push(this.getExistingGroups());
        promiseArr.push(this.getExistingRoles());
        promiseArr.push(this.getExistingApps());
        promiseArr.push(this.getExistingAuthClients());

        return Promise.all(promiseArr)
        .then((results) => { 
            if(
                // Check if any groups are still existing
                results[0].total > 0 || 

                // Check if any roles are existing
                results[1].total > 0 ||

                // Check if any apps are existing
                results[2].length > 0 ||

                results[3].length > 0
            ){

                return(true);
            }

            return(false);
        });
    }


    //// =======================================================
    ////      ROLES
    //// =======================================================

    /**
     * Get existing roles in purecloud based on prefix
     * @returns {Promise.<Array>} PureCloud Roles
     */
    getExistingRoles(){
        let authOpts = { 
            'name': this.prefix + "*", // Wildcard to work like STARTS_WITH 
            'userCount': false
        };

        return this.authApi.getAuthorizationRoles(authOpts);
    }

    /**
     * Delete existing roles from PureCloud
     * @returns {Promise}
     */
    deletePureCloudRoles(){
        return this.getExistingRoles()
        .then(roles => {
            let del_role = [];

            if(roles.total > 0){
                roles.entities.map(r => r.id).forEach(rid => {
                    del_role.push(this.authApi.deleteAuthorizationRole(rid));
                });
            }
            
            return Promise.all(del_role);
        });
    }

    /**
     * Add PureCLoud roles based on installation data
     * @returns {Promise}
     */
    addRoles(){
        let rolePromises = [];
        let roleData = []; // Array of {"rolename": "roleid"}

        // Create the roles
        this.installationData.roles.forEach((role) => {
            let roleBody = {
                    "name": this.prefix + role.name,
                    "description": "",
                    "permissionPolicies": role.permissionPolicies
            };

            // Assign role to user
            let roleId = null;
            rolePromises.push(
                this.authApi.postAuthorizationRoles(roleBody)
                .then((data) => {
                    this.logInfo("Created role: " + role.name);
                    roleId = data.id;

                    roleData[role.name] = roleId;

                    return this.getUserDetails();
                })
                .then((user) => {
                    // Assign the role to the user
                    // Required before you can assign the role to an Auth Client.
                    return this.authApi.putAuthorizationRoleUsersAdd(roleId, [user.id]);
                })
                .then((data) => {
                    this.logInfo("Assigned " + role.name + " to user");
                })
                .catch((err) => console.log(err))
            );
        });

        return Promise.all(rolePromises)
        .then(() => roleData);
    }

    //// =======================================================
    ////      GROUPS
    //// =======================================================

    /**
     * Gets the existing groups on PureCloud based on Prefix
     * @return {Promise.<Array>} PureCloud Group Objects
     */
    getExistingGroups(){
        // Query bodies
        let groupSearchBody = {
            "query": [
                {
                    "fields": ["name"],
                    "value": this.prefix,
                    "operator": "OR",
                    "type": "STARTS_WITH"
                }
            ]
        };

        return this.groupsApi.postGroupsSearch(groupSearchBody);
    }

    /**
     * Delete existing groups from PureCloud org
     * @returns {Promise}
     */
    deletePureCloudGroups(){
        return this.getExistingGroups()
        .then(groups => {
            let del_group = [];

            if(groups.total > 0){
                groups.results.map(grp => grp.id).forEach(gid => {
                    del_group.push(this.groupsApi.deleteGroup(gid));
                });
            }

            return Promise.all(del_group);
        });
    }

    /**
     * Add PureCloud groups based on installation data
     * @returns {Promise.<Object>} Group Data Object {"grp-name": "grp-id"}
     */
    addGroups(){
        let groupPromises = [];
        let groupData = {};

        this.installationData.groups.forEach((group) => {
            let groupBody = {
                "name": this.prefix + group.name,
                "description": group.description,
                "type": "official",
                "rulesVisible": true,
                "visibility": "public"
            };
            console.log(groupBody);

            groupPromises.push(
                this.groupsApi.postGroups(groupBody)
                .then((data) => {
                    this.logInfo("Created group: " + group.name);
                    groupData[group.name] = data.id;
                })
                .catch((err) => console.log(err))
            );
        });

        return Promise.all(groupPromises)
        .then(() => groupData);
    }


    //// =======================================================
    ////      INTEGRATIONS (APP INSTANCES)
    //// =======================================================

    /**
     * Get existing apps based on the prefix
     * @returns {Promise.<Array>} PureCloud Integrations
     */
    getExistingApps(){
        let integrationsOpts = {
            'pageSize': 100
        };
        
        return this.integrationsApi.getIntegrations(integrationsOpts)
        .then((data) => {
            return(data.entities
                .filter(entity => entity.name
                    .startsWith(this.prefix)));
        });  
    }

    /**
     * Delete all existing PremiumApp instances
     * @returns {Promise}
     */
    deletePureCloudApps(){
        return this.getExistingApps()
        .then(apps => {
            console.log(apps);
            let del_app = [];

            if (apps.length > 0){
                // Filter results before deleting
                apps.map(entity => entity.id)
                    .forEach(iid => {
                        del_app.push(this.integrationsApi.deleteIntegration(iid));
                });
            }

            return Promise.all(del_app);
        });
    }

    /**
     * Add PureCLoud instances based on installation data
     * @returns {Promise}
     */
    addInstances(groupData){
        let integrationPromises = [];
        let enableIntegrationPromises = [];
        let integrationsData = [];

        // After groups are created, create instances
        // There are 3 steps for creating the app instances
        // 1. Create instance of a custom-client-app
        // 2. Configure the app
        // 3. Activate the instances
        this.installationData.appInstances.forEach((instance) => {
            let integrationBody = {
                "body": {
                    "integrationType": {
                        "id": this.appName
                    }
                }
            };

            // Rename and add Group Filtering
            integrationPromises.push(
                this.integrationsApi.postIntegrations(integrationBody)
                .then((data) => {
                    this.logInfo("Created instance: " + instance.name);
                    let integrationConfig = {
                        "body": {
                            "name": this.prefix + instance.name,
                            "version": 1, 
                            "properties": {
                                "url" : instance.url,
                                "sandbox" : "allow-forms,allow-modals,allow-popups,allow-presentation,allow-same-origin,allow-scripts",
                                "displayType": instance.type,
                                "featureCategory": "", 
                                "groupFilter": instance.groups.map((groupName) => groupData[groupName]).filter(g => g != undefined)
                            },
                            "advanced": {},
                            "notes": "",
                            "credentials": {}
                        }
                    };

                    integrationsData.push(data);
                    return this.integrationsApi.putIntegrationConfigCurrent(data.id, integrationConfig);
                })
                .then((data) => {
                    this.logInfo("Configured instance: " + data.name);                           
                })
            );
        });

        return Promise.all(integrationPromises)
        // Activate the newly created application instances
        .then(() => {
            integrationsData.forEach((instance) => {
                let opts = {
                    "body": {
                        "intendedState": "ENABLED"
                    }
                };

                enableIntegrationPromises.push(
                    this.integrationsApi.patchIntegration(instance.id, opts)
                    .then((data) => this.logInfo("Enabled instance: " + data.name))
                    .catch((err) => console.log(err))
                );
            });
            
            return Promise.all(enableIntegrationPromises);
        });
    }

    //// =======================================================
    ////      OAUTH2 CLIENT
    //// =======================================================

    /**
     * Get existing authetication clients based on the prefix
     * @returns {Promise.<Array>} Array of PureCloud OAuth Clients
     */
    getExistingAuthClients(){
        return this.oAuthApi.getOauthClients()
        .then((data) => {
            console.log('==================================');
            console.log(data);
            return(data.entities
                .filter(entity => {
                    if(entity.name)
                        return entity.name.startsWith(this.prefix);
                    else
                        return false;
                }));
        });
    }

    /**
     * Delete all existing PremiumApp instances
     * @returns {Promise}
     */
    deleteAuthClients(){
        return this.getExistingAuthClients()
        .then((instances) => {
            let del_clients = [];

            if (instances.length > 0){
                // Filter results before deleting
                instances.map(entity => entity.id)
                    .forEach(cid => {
                        del_clients.push(this.oAuthApi.deleteOauthClient(cid));
                });
            }

            return Promise.all(del_clients);
        });
    }

    /**
     * Add PureCLoud instances based on installation data
     * @returns {Promise.<Array>} PureCloud OAuth objects
     */
    addAuthClients(roleData){
        let authPromises = [];
        let authData = [];

        this.installationData.oauth.forEach((oauth) => {
            let oauthClient = {
                "name": this.prefix + oauth.name,
                "description": oauth.description,
                "roleIds": oauth.roles.map((roleName) => 
                    roleData[roleName]).filter(g => g != undefined),
                "authorizedGrantType": "CLIENT_CREDENTIALS"
            };

            authPromises.push(
                this.oAuthApi.postOauthClients(oauthClient)
                .then((data) => {
                    authData.push(data);

                    this.logInfo("Created " + data.name + " auth client");
                })
                .catch((err) => console.log(err))
            );

            
        });

        return Promise.all(authPromises)
        .then(() => authData);
    }
    

    //// =======================================================
    ////      PROVISIONING / DEPROVISIONING
    //// =======================================================

    /**
     * Delete all existing Premium App PC objects
     * @returns {Promise}
     */
    clearConfigurations(){
        let configArr = [];

        configArr.push(this.deleteAuthClients());
        configArr.push(this.deletePureCloudGroups());
        configArr.push(this.deletePureCloudRoles());
        configArr.push(this.deletePureCloudApps());

        return Promise.all(configArr);
    }

    /**
     * Final Step of the installation wizard. 
     * Create the PureCloud objects defined in provisioning configuration
     * The order is important for some of the PureCloud entities.
     */
    installConfigurations(){
        // Create groups
        return this.addGroups()

        // Create instances after groups for (optional) group filtering
        .then((groupData) => this.addInstances(groupData))

        // Create Roles
        .then(() => this.addRoles())

        // Create OAuth client after role (required) and pass to server
        .then((roleData) => this.addAuthClients(roleData))
        .then((oAuthClients) => this.storeOAuthClient(oAuthClients))


        // When everything's finished, log a success message.
        .then(() => {
            this.logInfo("Installation Complete!");
        })
        .catch((err) => console.log(err));
    }

    /**
     * If an OAUTH Client is created pass the details over to a backend system.
     * NOTE: This function is for demonstration purposes and is neither functional
     *       nor production-ready.
     * @param {Array} oAuthClients PureCloud OAuth objects. 
     *         Normally there should only be 1 auth client created for an app.                     
     */
    storeOAuthClient(oAuthClients){
        // TODO: Replace with something functional for production

        // oAuthClients.forEach((client) => {
        //     $.ajax({
        //         url: "https://mycompany.org/premium-app",
        //         method: "POST",
        //         contentType: "application/json",
        //         data: JSON.stringify(oAuthClients)
        //     });
        // });

        console.log("Sent to server!");
    }

    //// =======================================================
    ////      DISPLAY/UTILITY FUNCTIONS
    //// =======================================================

    /**
     * Renders the proper text language into the web pages
     * @param {Object} text  Contains the keys and values from the language file
     */
    displayPageText(text){
        $(document).ready(() => {
            for (let key in text){
                if(!text.hasOwnProperty(key)) continue;
                $("." + key).text(text[key]);
            }
        });
    }

    /**
     * Shows an overlay with the specified data string
     * @param {string} data 
     */
    logInfo(data){
        if (!data || (typeof(data) !== 'string')) data = "";

        $.LoadingOverlay("text", data);
    }

    //// =======================================================
    ////      ENTRY POINT
    //// =======================================================
    start(){
        return new Promise((resolve, reject) => {
            this._setupClientApp()
            .then(() => this._pureCloudAuthenticate())
            .then((data) => { console.log(data); return resolve(); })
            .catch((err) => console.log(err));
        });
    }

    /**
     * First thing that needs to be called to setup up the PureCloud Client App
     */
    _setupClientApp(){    
        // Snippet from URLInterpolation example: 
        // https://github.com/MyPureCloud/client-app-sdk
        const queryString = window.location.search.substring(1);
        const pairs = queryString.split('&');

        let pcEnv = null;   
        let langTag = null;

        for (var i = 0; i < pairs.length; i++)
        {
            var currParam = pairs[i].split('=');

            if(currParam[0] === 'langTag') {
                langTag = currParam[1];
            } else if(currParam[0] === 'pcEnvironment') {
                pcEnv = currParam[1];
            } else if(currParam[0] === 'environment' && pcEnv === null) {
                pcEnv = currParam[1];
            }
        }

        // Stores the query parameters into localstorage
        // If query parameters are not provided, try to get values from localstorage
        // Default values if it does not exist.
        if(pcEnv){
            localStorage.setItem(this.appName + ":environment", pcEnv);
        }else if(localStorage.getItem(this.appName + ":environment")){
            pcEnv = localStorage.getItem(this.appName + ":environment");
        } else {
            // Use default PureCloud region
            pcEnv = appConfig.defaultPcEnv;
        }
        this.pcApp = new window.purecloud.apps.ClientApp({pcEnvironment: pcEnv});


        if(langTag){
            this.language = langTag;
            localStorage.setItem(this.appName + ":langTag", langTag);
        }else if(localStorage.getItem(this.appName + ":langTag")){
            langTag = localStorage.getItem(this.appName + ":langTag");
            this.language = langTag;
        } else {
            // Use default Language
        }
        
        console.log(this.pcApp.pcEnvironment);

        // Get the language context file and assign it to the app
        // For this example, the text is translated on-the-fly.
        return new Promise((resolve, reject) => {
            let fileUri = './languages/' + this.language + '.json';
            $.getJSON(fileUri)
            .done(data => {
                this.displayPageText(data);
                resolve();
            })
            .fail(xhr => {
                console.log('Language file not found.');
                resolve();
            }); 
        });
    }

    /**
     * Authenticate to PureCloud (Implicit Grant)
     * @return {Promise}
     */
    _pureCloudAuthenticate() {
        this.purecloudClient.setEnvironment(this.pcApp.pcEnvironment);
        return this.purecloudClient.loginImplicitGrant(
                        appConfig.clientIDs[this.pcApp.pcEnvironment], 
                        this.redirectUri, 
                        {state: ('pcEnvironment=' + this.pcApp.pcEnvironment)});
    }
}


export default WizardApp;