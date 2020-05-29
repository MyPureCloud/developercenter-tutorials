import config from '../config/config.js';
import view from './view.js';

// Module scripts
import roleModule from './modules/role.js';
import groupModule from './modules/group.js';
import appInstanceModule from './modules/app-instance.js';
import OAuthClientModule from './modules/oauth-client.js';
import dataTableModule from './modules/data-table.js';

// Add new modules here
// This will later be filtered in setup() to only use
// what's in the config
let modules = [
    roleModule, 
    groupModule, 
    appInstanceModule, 
    OAuthClientModule,
    dataTableModule
];

const jobOrder = config.provisioningInfo;
const prefix = config.prefix;

// PureCloud
const platformClient = require('platformClient');
let client = null;

let userMe = null;
let installedData = {};


/**
 * Get's all the currently installed items as defined in the
 * job order.
 * @returns {Promise} Array of the installed objects
 */
function getInstalledObjects(){
    let promiseArr = [];

    modules.forEach((module) => {
        if(jobOrder[module.provisioningInfoKey]){
            promiseArr.push(module.getExisting());
        }
    });

    return Promise.all(promiseArr);
}

export default {
    /**
     * Setup the wizard with references
     * @param {Object} pcClient PureCloud API Client
     * @param {Object} user PureCloud user object
     */
    setup(pcClient, user){
        client = pcClient;
        userMe = user;

        // Use only modules in provisioning info
        modules = modules.filter((module) => {
            return Object.keys(config.provisioningInfo)
                    .includes(module.provisioningInfoKey);
        });
    },

    getInstalledObjects: getInstalledObjects,

    /**
     * Checks if any installed objects are still existing
     * @returns {Promise<boolean>}
     */
    isExisting(){
        let exists = false;

        return getInstalledObjects()
        .then((installed) => {
            console.log(installed);
            installed.forEach(item => {
                if(item.total && item.total > 0){
                    // If it's  a purecloud search reslts
                    exists = true;
                }else{
                    // if it's just an array
                    exists = item.length > 0 ? true : exists;
                }
            });

            return exists;
        })
        .catch((e) => console.error(e));
    },

    /**
     * Installs all the modules
     * @returns {Promise<Array>} array of finally function resolves
     */
    install(){
        let creationPromises = [];
        let configurationPromises = [];
        let finalFunctionPromises = [];

        // Create all the items
        modules.forEach((module) => {
            let moduleProvisioningData = config.provisioningInfo[module.provisioningInfoKey];

            if(!moduleProvisioningData) return;

            creationPromises.push(
                module.create(
                    view.showLoadingModal, 
                    moduleProvisioningData
                )
            );
        });

        
        return Promise.all(creationPromises)
        .then((result) => {
            // Configure all items
            modules.forEach((module, i) => {
                installedData[module.provisioningInfoKey] = result[i]; 
            });

            modules.forEach((module) => {
                configurationPromises.push(
                    module.configure(
                        view.showLoadingModal,
                        installedData,
                        userMe.id
                    )
                );
            });

            return Promise.all(configurationPromises);
        })
        .then(() => {
            view.showLoadingModal('Executing Final Steps...');

            // Loop through all items with finally 
            Object.keys(config.provisioningInfo).forEach(key => {
                let provisionItems = config.provisioningInfo[key];
                provisionItems.forEach((item) => {
                    if(item.finally){
                        finalFunctionPromises.push(
                            item.finally(installedData[key][item.name])
                        );
                    }
                })
            });

            return Promise.all(finalFunctionPromises);
        })
        .catch((e) => console.error(e));
    },

    /**
     * Uninstall all the modules
     * @returns {Promise<Array>} module remove promises
     */
    uninstall(){
        let promiseArr = [];

        modules.forEach((module) => {
            promiseArr.push(
                module.remove(view.showLoadingModal)
            );
        });

        return Promise.all(promiseArr);
    }
}