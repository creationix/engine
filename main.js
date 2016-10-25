// Bootstrap require system and inject builtin globals
nucleus.dofile("builtins/index.js");

var Server = require('web').Server;
var fetch = require('git').fetch;
var redisStorage = require('redis-storage');

// Global config
// TODO: pull these from command line or environment variables.
var path = "/creationix/creationix.com.git";
var ref = "refs/heads/www";

var roots = {};

pull().then(serve).catch(p);

// Serve application over HTTP
function serve() {
  var server = new Server();
  server.use(require('web-log'));
  server.use(require('web-auto-headers'));

  server.route({
    method: "GET",
    path: "/github-hook",
  }, function (req, res) {
    return pull().then(function (result) {
      res.code = 200;
      res.headers.set("Content-Type", "application/json");
      res.body = JSON.stringify(result, null, 2) + "\n";
      p(res);
    }).catch(function (err) {
      res.code = 500;
      res.headers.set("Content-Type", "text/plain");
      res.body = err.stack;
    });
  });

  server.route({
    path: "/:name",
  }, function (req, res) {
    res.code = 200;
    res.headers.set("Content-Type", "text/plain");
    res.body = "Hello " + req.params.name + "\n";
  });

  server.start();
}

// Pull updates from github and store data in redis.
function pull() {
  print("Checking for updates from git://github.com" + path + "...");
  return redisStorage().then(function (storage) {
    return storage.call("get", path).then(function (root) {
      root = root && root.toString();
      return fetch({
        host: "192.30.253.113", // github.com
        hostName: "github.com",
        // host: "127.0.0.1",
        ref: ref,
        have: root,
        path: path,
        load: storage.load,
        save: storage.save,
      }).then(function (result) {
        roots[path] = result.root;
        if (result.root === root) {
          print("No updates");
          return result;
        }
        print("Updated to " + result.root);
        return storage.call("set", path, result.root).then(function () {
          return result;
        });
      });
    }).then(function (result) {
      return storage.call.write().then(function () {
        return result;
      });
    });
  });
}

// Start the event loop.
require('uv').run();
