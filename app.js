var express = require('express');
var request = require('request');
var async = require('async');

var config = require('./config');
if (! (config.singly.client_id && config.singly.client_secret) ) {
  console.log('SINGLY_CLIENT_ID & SINGLY_CLIENT_SECRET required!!!');
  process.exit(1);
}

var singly = require('singly')(config.singly.client_id, config.singly.client_secret, config.singly.redirect_uri);
var db = require('./db');
var collection;

// Create an HTTP server
var app = express.createServer();

// Setup for the express web framework
app.configure(function() {
  app.use(express.logger());
  app.use(express.static(__dirname + '/static'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: config.sessionSecret
  }));
  app.use(app.router);
});


app.get('/auth_callback', function(req, res) {
  var code = req.param('code');
  if (!code) return res.send('got error:' + req.param('error'), 500);
  singly.getAccessToken(req.param('code'), function(err, body) {
    if (err) return res.send(err);
    req.session.access_token = body;
    singly.apiCall('/profiles', {data:true, access_token: req.session.access_token}, function(err, profiles) {
      console.error("DEBUG: profiles", profiles);
      if (!(profiles && profiles.foursquare)) return res.send('need to auth 4sq!');
      req.session.id = profiles.id;
      addUser(req.session.id, req.session.access_token, req.session.handle, function(err) {
        if (err) return res.send(err, 500);
        res.redirect('/last_checkin');
      });
    });
  });
});

app.post('/add_handle', function(req, res) {
  var handle = req.param('handle');
  if (!handle) return res.send("must enter your handle!", 400);
  req.session.handle = handle;
  res.redirect(singly.getAuthorizeURL('foursquare'));
});

app.get('/get_hq', function(req, res) {
  getHQHandles(function(err, handles) {
    if (err) return res.send(err, 500);
    res.send(handles);
  });
});

app.get('/last_checkin', function(req, res) {
  if (!(req.session && req.session.access_token)) return res.redirect('/');
  getLastCheckin(req.session.access_token, function(err, lastCheckin) {
    if (err) console.error("DEBUG: err", err);
    res.send(lastCheckin);
  });
});


app.get('/access_token', function(res, res) {
  res.send(req.session.access_token);
})

var sort = [['_id','asc']];
var options = {upsert:true};
function addUser(id, access_token, handle, callback) {
  var query = {id:id};
  var update = {$set: {id: id, access_token: access_token, handle:handle}};
  collection.findAndModify(query, sort, update, options, callback);
}

function setUserIsAtHQ(id, is, callback) {
  var query = {id:id};
  var update = {$set: {isAtHQ: is}};
  collection.findAndModify(query, sort, update, {}, callback);
}

function getHQHandles(callback) {
  // collection.find({}).toArray(function(err, users) {
  collection.find({isAtHQ:true}).toArray(function(err, users) {
    if (err) res.send(err, 500);
    console.error("DEBUG: users", users);
    var handles = [];
    for(var i in users) handles.push(users[i].handle);
    callback(null, handles);
  });
}


function updateHQHandles(callback) {
  console.log("updateHQHandles...");
  collection.find({}).toArray(function(err, results) {
    if(err) return console.error("DEBUG: err", err);
    async.forEach(results, function(user, cb) {
      isAtHQ(user.access_token, function(err, is) {
        if (err) return callback(err, is);
        console.log('user is', is? '': 'not', 'at HQ.');
        setUserIsAtHQ(user.id, is, cb);
      });
    }, callback);
  });
}

function isAtHQ(access_token, callback) {
  getLastCheckin(access_token, function(err, lastCheckin) {
    if (err) return callback(err, lastCheckin);
    if (!(lastCheckin && lastCheckin.data && lastCheckin.data.venue)) return callback('bad checkin', lastCheckin)
    callback(null, lastCheckin.data.venue.id === config.hq);
  });
}

function getLastCheckin(access_token, callback) {
  singly.apiCall('/services/foursquare/checkins', {access_token:access_token, limit:1}, function(err, checkins) {
    if (err) return callback(err);
    var lastCheckin = checkins[0];
    console.error("DEBUG: lastCheckin venue id", lastCheckin && lastCheckin.data && lastCheckin.data.venue && lastCheckin.data.venue.id);
    return callback(null, lastCheckin);
  });
}

db.init(function(err, _collection) {
  if (err) {
    console.error('error connecting to db!', err);
    return process.exit(1);
  }
  collection = _collection;
  console.log('connected to db!');

  app.listen(config.app.port);
  console.log('listening on ' + config.app.port);

  setInterval(updateHQHandles, config.pingInterval);
});
