var express = require('express');
var app = express();

app.get('/', function(req, res) {
    res.send('hello world');
});

console.log('server listening on port 3000');
app.listen(3000);
