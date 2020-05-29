import config from '../config/config.js';
import view from './view.js';
import wizard from './wizard.js';

// PureCloud
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;
const ClientApp = window.purecloud.apps.ClientApp;

// API 
const usersApi = new platformClient.UsersApi();
const integrationsApi = new platformClient.IntegrationsApi();

// Constants
const appName = config.appName;
        
// Variables
let pcLanguage = localStorage.getItem(appName + ':language') ||
                    config.defaultLanguage;
let pcEnvironment = localStorage.getItem(appName + ':environment') ||
                    config.defaultPcEnvironment;
let clientApp = null;
let userMe = null;


/**
 * Get query parameters for language and purecloud region
 */
function queryParamsConfig(){
    // Get Query Parameters
    const urlParams = new URLSearchParams(window.location.search);
    let tempLanguage = urlParams.get(config.languageQueryParam);
    let tempPcEnv = urlParams.get(config.pureCloudEnvironmentQueryParam); 

    // Override default and storage items with what's on search query
    if(tempLanguage){
        pcLanguage = tempLanguage;
        localStorage.setItem(appName + ':language', pcLanguage);
    }
    if(tempPcEnv){
        pcEnvironment = tempPcEnv;
        localStorage.setItem(appName + ':environment', pcEnvironment);
    }
}

/**
 * Authenticate with PureCloud
 */
function authenticatePureCloud(){
 client.setEnvironment(pcEnvironment);
    client.setPersistSettings(true, appName);
    return client.loginImplicitGrant(
                config.clientIDs[pcEnvironment], 
                config.wizardUriBase + 'index.html'
            );
}

/**
 * Get user details with its roles
 * @returns {Promise} usersApi result
 */
function getUserDetails(){
    let opts = {'expand': ['authorization']};
    
    return usersApi.getUsersMe(opts);
}

/**
 * Checks if the PureCloud org has the premium app product enabled
 * @returns {Promise}
 */
function validateProductAvailability(){      
    return integrationsApi.getIntegrationsTypes({})
    .then((data) => {
        if (data.entities.filter((integType) => integType.id === appName)[0]){
            console.log("PRODUCT AVAILABLE");
            return(true);
        } else {
            console.log("PRODUCT NOT AVAILABLE");
            return(false);
        }
    });
}

/**
 * Setup function
 * @returns {Promise}
 */
function setup(){
    view.showLoadingModal('Loading...');
    view.hideContent();

    queryParamsConfig();
    
    // Setup Client App
    clientApp = new ClientApp({
        pcEnvironment: pcEnvironment
    });

    return authenticatePureCloud()
    .then(() => {
        return getUserDetails();
    })
    .then((user) => {
        userMe = user;

        return setPageLanguage();
    })  
    .then(() => {
        wizard.setup(client, userMe);

        return runPageScript();
    })  
    .then(() => {
        view.hideLoadingModal();
    })
    .catch((e) => console.error(e));    
}

/**
 * Sets and loads the language file based on the pcLanguage global var
 * @returns {Promise}
 */
function setPageLanguage(){
    return new Promise((resolve, reject) => {
        let fileUri = 
            `${config.wizardUriBase}assets/languages/${pcLanguage}.json`;
        $.getJSON(fileUri)
        .done(data => {
            Object.keys(data).forEach((key) => {
                let els = document.querySelectorAll(`.${key}`);
                for(let i = 0; i < els.length; i++){
                    els.item(i).innerText = data[key];
                }
            })
            resolve();
        })
        .fail(xhr => {
            console.log('Language file not found.');
            resolve();
        }); 
    });
}

/**
 * Runs page specific script.
 * @returns {Promise}
 */
function runPageScript(){
    return new Promise((resolve, reject) => {
        let pathParts = window.location.pathname.split('/');
        let page = pathParts[pathParts.length - 1];

        // Run Page Specific Scripts
        switch(page){
            case 'index.html':
                // Button Handler
                let elNextBtn = document.getElementById('next');
                elNextBtn.addEventListener('click', () => {
                    window.location.href = './install.html';
                });

                validateProductAvailability()
                .then((isAvailable) => {
                    if(isAvailable){
                        view.showProductAvailable();
                    }else{
                        view.showProductUnavailable();
                    }

                    return wizard.isExisting();
                })
                // Check if has an existing installation
                .then((exists) => {
                    if(exists) {
                       window.location.href = config.premiumAppURL;
                    } else {
                        view.showContent();
                        resolve();
                    }
                });
                break;
            case 'install.html':
                // Button Handler
                let elStartBtn = document.getElementById('start');
                elStartBtn.addEventListener('click', () => {
                    view.showLoadingModal('Installing..');
                    wizard.install()
                    .then(() => {
                        window.location.href = './finish.html';
                    })
                    .catch(e => console.error(e))
                });

                resolve();
                view.showContent();
                break;
            case 'finish.html':
                view.showContent();
                setTimeout(() => {
                    window.location.href = config.premiumAppURL;
                }, 2000);

                resolve();
                break;
            case 'uninstall.html':
                alert("The uninstall button is for development purposes only. Remove this button before demo.");

                view.showContent();
                view.showLoadingModal('Uninstalling...');

                wizard.uninstall()
                .then(() => {
                    setTimeout(() => {
                        window.location.href = config.wizardUriBase 
                                        + 'index.html';
                    }, 2000);
                });
                resolve();
                break;
            default:
                reject('Unknown page');
                break;
        }
    });
}


setup();