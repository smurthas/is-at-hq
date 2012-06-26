var mongodb = require('mongodb');
var Db = mongodb.Db;
var Server = mongodb.Server;

var config = require('./config');

var client = new Db(config.db.name, new Server(config.db.host, config.db.port, {}), {});

exports.init = function(callback) {
  client.open(function(err, p_client) {
    if (err) return callback(err, p_client);
    if(config.db.user && config.db.pass) {
      console.log('authenticating with mongo for user', config.db.user);
      return client.authenticate(config.db.user, config.db.pass, function(err) {
        if (err) return callback(err);
        client.collection(config.db.collection, callback);
      });
    }
    client.collection(config.db.collection, callback);
  });
}