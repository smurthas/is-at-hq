var express = require('express');
var request = require('request');
var singly = require('singly');

var config = require('./config');
var db = require('./db');
var collection;

// Create an HTTP server
var app = express.createServer();

// Setup for the express web framework
app.configure(function() {
  app.use(express.logger());
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: config.sessionSecret
  }));
  app.use(app.router);
});


app.get('/auth/foursquare', function(req, res) {
  res.redirect(singly.getAuthorizeURL('foursquare'));
});

app.get('/auth_callback', function(req, res) {
  singly.getAccessToken(req.query('code'), function(err, body) {
    singly.apiCall('/services/foursquare/')
  });
});


function addFoursquareUser

function get


db.init(function(err, _collection) {
  if (err) {
    console.error('error connecting to db!', err);
    return process.exit(1);
  }
  collection = _collection;
  console.log('connected to db!');

  app.listen(config.app.port);
  console.log('listening on ' + config.app.port);
});