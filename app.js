var express = require('express');
var fs = require('fs');
var http = require('http');
var https = require('https');

var privateKey = fs.readFileSync('./server.key', 'utf8');
var certificate = fs.readFileSync('./server.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};

var express = require('express');
var app = express();

var qs = require('querystring');

var https_port = 443;
var http_port = 80;

var httpServer = express();
httpServer.get('*', function(req, res) {
    res.redirect('https://127.0.0.1');
});

app.get('/', function(req, res) {
    console.log('redirecting');
    res.redirect('https://api.genius.com/oauth/authorize/?'
        + 'client_id=uMTvHSICCNZWX_k4PKtrF6247uDmUVH0orpPAGyeo_yFNR5cCpznC6xtxW73g0Bn&'
        + 'redirect_uri=https://127.0.0.1/home&scope=me create_annotation '
        + 'manage_annotation&state=0&response_type=code');
});

app.get('/home', function(req, res) {
    var queryString = req.url.substring(5); 
    console.log(req.url);
    if (queryString) {
        if (queryString[0] == '?') {
            queryString = queryString.substring(1);
        }
        parsedQuery = qs.parse(queryString);
        console.log(parsedQuery);
        var containsCode = false;
        for (item in parsedQuery) {
            console.log(item);
            if (item == 'code') {
                containsCode = true;
            }
        } 

        if (containsCode) {
            console.log('sending token request');
            makeTokenRequest(parsedQuery);
        }
    }

    res.send('hello world');

});
var httpsServer = https.createServer(credentials, app);

console.log('server listening on port ' + http_port);
httpServer.listen(http_port);
console.log('server listening on port ' + https_port);
httpsServer.listen(https_port);


function makeTokenRequest(queryObject) {
    var tokCode = queryObject['code']
    // Can't be showing sensitive data to you!
    var appSecret = fs.readFileSync('./AppSecret.txt', 'utf8');
    appSecret = appSecret.trim();
    var grantType = 'authorization_code'
    var clientId = 'uMTvHSICCNZWX_k4PKtrF6247uDmUVH0orpPAGyeo_yFNR5cCpznC6xtxW73g0Bn';
    var redirect = 'https://127.0.0.1/home';
    var respType = 'code';

    var tokReqData = 'code=' + tokCode
        + '&client_secret=' + appSecret
        + '&grant_type=' + grantType
        + '&client_id=' + clientId
        + '&redirect_uri=' + redirect
        + '&response_type=' + respType;
    var tokPostOpt = {
        hostname: 'api.genius.com',
        port: 443,
        path: '/oauth/token',
        method: 'POST'
    };

    var tokReq = https.request(tokPostOpt, function(res) {
        res.on('data', function(chunk) {
            console.log('Response: ' + chunk);
        });
    });
    console.log('post request: ' + tokReqData);
    tokReq.write(tokReqData);
    tokReq.end();

}

