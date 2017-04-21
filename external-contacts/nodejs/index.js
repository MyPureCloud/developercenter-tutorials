var purecloud = require('purecloud_api_sdk_javascript');
var CSV = require('csv-string');
var fs = require('fs');

var pureCloudSession = purecloud.PureCloudSession({
    strategy: 'client-credentials',
    clientId: process.env.PURECLOUD_CLIENT_ID,
    clientSecret: process.env.PURECLOUD_CLIENT_SECRET,
    timeout: 10000,
    environment: process.env.PURECLOUD_ENVIRONMENT
});

pureCloudSession.login().then(function() {
    var externalContactsApi = new purecloud.ExternalContactsApi(pureCloudSession);

    var body = {
        "name": "Developer Tutorial Company",
        "industry": "Software",
        "address": {
            "address1": "7601 Interactive Way",
            "city": "Indianapolis",
            "state": "Indiana",
            "postalCode": "46278",
            "countryCode": "USA"
        },
        "employeeCount": 2000,
        "websites": [
            "https://developer.mypurecloud.com"
        ],
        "twitterId": {
            "screenName": "PureCloud_dev"
        }
    };

    externalContactsApi.postOrganizations(body).then(function(organization){
        console.log("Created organization "+ organization.id);

        fs.readFile('contacts.csv', 'utf8', function (err,data) {
            if (err) {
                return console.log(err);
            }
            var arr = CSV.parse(data);

            for(let x=1; x<arr.length; x++){
                let userData = arr[x];
                let user = {
                    "firstName": userData[0],
                    "lastName": userData[1],
                    "title": userData[5],
                    "workPhone": {
                        "display": userData[6]
                    },
                    "address": {
                        "address1": userData[2],
                        "city": userData[3],
                        "postalCode": userData[4]
                    },
                    "workEmail": userData[8],
                    "externalOrganization": {
                        "id": organization.id
                    }
                };

                externalContactsApi.postContacts(user).then(function(data){
                    console.log(`User ${userData[0]} ${userData[1]}`);
                }).catch(function(error){
                    console.error(error);
                });
            }

        });

    }).catch(function(error){
        //error while making call
        console.error(error);
    });
}).catch((err)=>{
    console.error(err);
});
