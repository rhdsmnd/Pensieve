var express = require('express');
var app = express();
var http_port = 80

app.get('/', function(req, res) {
    res.send('hello world');
});

console.log('server listening on port ' + http_port);
app.listen(http_port);
