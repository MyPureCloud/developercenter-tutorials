const http = require('http');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const cookieParser = require('cookie-parser');
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

var app = express();

// OAuth Code Authorization Credentials
var clientId = process.env.GENESYS_CLOUD_CLIENT_ID;
var clientSecret = process.env.GENESYS_CLOUD_CLIENT_SECRET;
var environment = process.env.GENESYS_CLOUD_ENVIRONMENT; // eg. 'mypurecloud.com'

/**
 * This function is used as an express middleware and will be invoked in
 * every HTTP request that hits the webserver. If there is no session with 
 * Genesys Cloud, redirect the user to the Genesys Cloud login page.
 */
var authvalidation = function(req, res, next) {
    console.log('\n['+req.method+' '+req.url+']');
    //if we don't have a session then redirect them to the login page
    if((req.cookies && !(req.cookies.session && sessionMap[req.cookies.session])) &&
            req.url.indexOf('oauth') == -1){
        //redirect the user to authorize with Genesys Cloud
        var redirectUri = `https://login.${environment}/oauth/authorize?` +
                    'response_type=code' +
                    '&client_id=' + clientId +
                    '&redirect_uri=http://localhost:8085/oauth2/callback';

        console.log('redirecting to ' + redirectUri);
        res.redirect(redirectUri);

        return;
    }

    //if we do have a session, just pass along to the next http handler
    console.log('have session')
    next();
}

// Registration of express middlewares
app.use(express.json());
app.use(cookieParser());
app.use(authvalidation);
app.use(express.static(__dirname));

var sessionMap ={};

app.get('/', function(req, res){
    res.redirect('/my_info.html');
})

//this route handles the oauth callback
app.get('/oauth2/callback', async function(req,res){
    //the authorization page has called this callback and now we need to get the bearer token
    console.log('oauth callback')
    console.log(req.query.code)
    var authCode = req.query.code;

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', authCode);
    params.append('redirect_uri', 'http://localhost:8085/oauth2/callback');

    fetch(`https://login.${environment}/oauth/token`, { 
        method: 'POST',
        headers: {
           'Content-Type': 'application/x-www-form-urlencoded',
           'Authorization': `Basic ${Buffer.from(clientId + ':' + clientSecret).toString('base64')}`
        },
        body: params
    })
    .then(res => res.json())
    .then(tokenResponse => {
        console.log('got token data back: ')
        console.log(tokenResponse);

        var sessionId = uuidv4();

        //store the session id as a key in the session map, the value is the bearer token for Genesys Cloud.
        //we want to keep that secure so won't send that back to the client
        sessionMap[sessionId] = tokenResponse.access_token;

        //send the session id back as a cookie
        res.cookie('session', sessionId);
        res.redirect('/my_info.html');    
    })
    .catch(e => console.error(e));
});

//wrap up the api/v2/users/me call inside a /me route
app.get('/me', function(req, res){
    //get the session from map using the cookie
    var oauthId = sessionMap[req.cookies.session];

    fetch(`https://api.${environment}/api/v2/users/me`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${oauthId}`
        }
    })
    .then(res => res.json())
    .then(user => {
        console.log('Got response for /users/me');
        console.log(user);
         res.send(user);
    })
    .catch(e => console.error(e));

});

var httpServer = http.createServer(app);
httpServer.listen('8085');
console.log('ready');
