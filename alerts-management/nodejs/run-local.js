const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');

const privateKey = fs.readFileSync('ssl/_localhost.key', 'utf8');
const certificate = fs.readFileSync('ssl/_localhost.crt', 'utf8');

const credentials = {key: privateKey, cert: certificate};
const app = express();

app.use(express.static('docs'));

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(8080);
console.log('HTTP listening on: 8080');
httpsServer.listen(443);
console.log('HTTPS listening on: 443');

