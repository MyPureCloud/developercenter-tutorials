const platformClient = require('purecloud-platform-client-v2');

platformClient.ApiClient.instance.authentications['PureCloud Auth'].accessToken = '';

var apiInstance = new platformClient.UsersApi();

var newuser = { 
    name: "Tutorial User", 
    email: "tutorial378@example.com",
    password: "230498wkjdf8asdfoiasdf"
};

apiInstance.postUsers(newuser)
  .then(function(currentuser) {
    console.log(currentuser.id);
    var updateUser = {
        // TAKE NOTE THAT VERSION IS REQUIRED VALUE IN UPDATING A USER
        version: currentuser.version,
        name: "Tutorial User New Name",
        addresses:[
            {
                address: "3172222222",
                mediaType: "PHONE",
                type: "WORK"
            }
        ]
    };

    apiInstance.patchUser(currentuser.id, updateUser).catch(function(err) {
        console.error(err);
    });

  })
  .catch(function(err) {
  	console.error(err);
  });
