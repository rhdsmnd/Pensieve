var express = require('express');
var fs = require('fs');
var http = require('http');
var https = require('https');

var privateKey = fs.readFileSync('./server.key', 'utf8');
var certificate = fs.readFileSync('./server.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};

var express = require('express');
var app = express();

var https_port = 443;
var http_port = 80;

var httpServer = express();
httpServer.get('*', function(req, res) {
    res.redirect('https://127.0.0.1');
});

app.get('/', function(req, res) {
    console.log(req.url);
    res.send('hello world');
});
var httpsServer = https.createServer(credentials, app);

console.log('server listening on port ' + http_port);
httpServer.listen(http_port);
console.log('server listening on port ' + https_port);
httpsServer.listen(https_port);
