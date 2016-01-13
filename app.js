var express = require('express');
var fs = require('fs');
var http = require('http');
var https = require('https');

var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1/Pensieve');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error.'));
db.once('open', function() {
    console.log('Connected to mongo Pensieve db');
});

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var userToSessionSchema = new Schema({
    _id: Number,
    session_id: ObjectId 
});
var UserToSession = mongoose.model('UserToSession', userToSessionSchema); 

var sessionDataSchema = new Schema({
    user_id: Number,
    token:  {
                value: String,
                tok_type: String
            }
});
var SessionData = mongoose.model('SessionData', sessionDataSchema);

var uid = require('uid');

/**
SessionData.create({
    _id: uid(24),
    user_id: 1234,
    token: {
                value: "helloToken",
                tok_type: "bearer"
        }
}, function (err, helloMongo) {
    if (err) return handleError(err);
    console.log('STORED OBJECT SESSIONDATA');
});
*/

/**
var crypto = require('crypto');
var alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-=';
var alphabetObj = {};
for (var i = 0; i < alphabet.length; i += 1) {
    alphabetObj[i] = alphabetObj[i];
}
*/


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
            makeTokenRequest(parsedQuery, res);
            return;
        }
    }
    res.send('hello world.');

});
var httpsServer = https.createServer(credentials, app);

console.log('server listening on port ' + http_port);
httpServer.listen(http_port);
console.log('server listening on port ' + https_port);
httpsServer.listen(https_port);

function getAccount(tokenObj, loginRes) {
    console.log('getting account'); 
    var getHeaders = {
        'Authorization': tokenObj['token_type']
            + ' ' + tokenObj['access_token']
    };
    var getAccountOpt = {
        hostname: 'api.genius.com',
        port: 443,
        path: '/account',
        method: 'GET',
        headers: getHeaders
    };
    var getReq = https.request(getAccountOpt, function(res) {
        console.log('status code: ', res.statusCode);
        console.log('headers: ', res.headers);

        res.on('data', function (d) {
            var userData = JSON.parse(d.toString())['response']['user'];
            console.log('user data ', userData);
            var sessionId = uid(24);
            console.log('session id: ', sessionId);
            UserToSession.findOneAndUpdate({ _id: userData['id'] },
                { _id: userData['id'], session_id: sessionId },
                { upsert: true}, function(error, doc) {
                    if (error) {
                        console.log('error resetting user session map',
                                    error);
                    } else {
                        console.log('successfully upserted user-session');
                    }
            });
            var newSession = new SessionData({
                _id : sessionId,
                user_id: userData['id'],
                token: {
                    value: tokenObj['access_token'],
                    tok_type: tokenObj['token_type']
                }
            });
            newSession.save(function(err, newSession) {
                if (err) {
                    console.log('error inserting new session object',
                                err);
                } else {
                    console.log('successfully created new session.');
                }
            });

            console.log('sending session id back to end user');
            loginRes.cookie('session_set', sessionId.toString(),
                { httpOnly: true, secure: true });

            loginRes.send("we've reached liftoff!");
                
        });
    });

    console.log('get request object ', getReq);
    getReq.end();
    
}

function makeTokenRequest(queryObject, clientRes) {
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
            resObj = JSON.parse(chunk);
            tokenTypeCorrect = resObj['token_type'] && resObj['token_type'] == 'bearer';
            if (resObj['access_token'] && tokenTypeCorrect) {
                // stores new session data and upserts new user-session
                getAccount(resObj, clientRes);

            } else {
                console.log('Could not get access token from genius');
            }
        });
    });
    console.log('post request: ' + tokReqData);
    tokReq.write(tokReqData);
    tokReq.end();

}

