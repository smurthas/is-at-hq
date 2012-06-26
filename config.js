var url = require('url');
var config = {
  singly: {
    client_id: get('SINGLY_CLIENT_ID'),
    client_secret: get('SINGLY_CLIENT_SECRET')
  },
  db: {
    host: get('DB_HOST', 'localhost'),
    port: get('DB_PORT', 27017),
    name: get('DB_NAME', 'athq'),
    collection: get('DB_COLLECTION', 'users'),
    url: get('MONGOLAB_URI')
  },
  app: {
    host: get('HOST', 'localhost'),
    port: get('PORT', 8043)
  },
  sessionSecret: get('SESSION_SECRET', '42'),
  pingInterval: parseInt(get('PING_INTERVAL', 60) * 1000),
  hq: get('HQ', '4daf691893a037b7b06ee236')
};

config.app.url = generateURL();

if (config.db.url) {
  var parsedURL = url.parse(config.db.url);
  var auth = parsedURL.auth.split(':');
  config.db.user = auth[0];
  config.db.pass = auth[1];
  config.db.port = parseInt(parsedURL.port);
  config.db.host = parsedURL.hostname;
  config.db.name = parsedURL.pathname.substring(1);
}

config.singly.redirect_uri = config.app.url + '/auth_callback';

function get(name, _default) {
  return process.env[name] || _default;
}

function generateURL() {
  if (config.app.host === 'localhost') return 'http://localhost:' + config.app.port;
  return 'http://' + config.app.host;
}

module.exports = config;