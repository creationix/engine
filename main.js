"use strict";
// Bootstrap require system and inject builtin globals
nucleus.dofile("builtins/index.js");

var Server = require('web').Server;
var fetch = require('git').fetch;
var decodeCommit = require('git').decodeCommit;
var decodeTree = require('git').decodeTree;
var redisStorage = require('redis-storage');
var guess = require('mime');

// Global config
// TODO: pull these from command line or environment variables.
var path = "/creationix/creationix.com.git";
var ref = "refs/heads/www";

var rootHash;

pull().then(serve).catch(p);

// Serve application over HTTP
function serve() {
  var server = new Server();
  server.use(require('web-log'));
  server.use(require('web-auto-headers'));

  server.bind({
    port: 7006
  });

  server.route({
    method: "POST",
    path: "/github-hook",
  }, function (req, res) {
    return pull().then(function (result) {
      res.code = 200;
      res.headers.set("Content-Type", "application/json");
      res.body = JSON.stringify(result, null, 2) + "\n";
      p(res);
    });
  });

  server.use(function (req, res, next) {
    return render(req.path).then(function (response) {
      p("RESPONSE", response)
      if (!response) return next();
      var defaultCode = 404;
      if (response.mime) res.headers.set("Content-Type", response.mime);
      if (response.redirect) {
        defaultCode = 302;
        res.headers.set("Location", response.redirect);
      }
      res.code = response.code || defaultCode;
      if (response.body) res.body = response.body;
    });
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
        rootHash = result.root;
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

function render(path) {
  return redisStorage().then(function (storage) {
    var load = storage.load;
    var parts = path.split('/').filter(Boolean);
    var index = 0, last = parts.length;
    return load(rootHash).then(onObject);

    function onObject(obj) {
      if (obj.type === "commit") {
        var commit = decodeCommit(obj.data);
        return load(commit.tree).then(onObject);
      }
      if (index === last) {
        return renderObj(obj);
      }
      var part = parts[index++];
      if (obj.type === "tree") {
        var tree = decodeTree(obj.data);
        var entry = tree[part];
        if (!entry) return { body: "No such file: " + path };
        return load(entry.hash).then(onObject);
      }
      if (!entry) return { body: "No such file: " + path };
    }

    function renderObj(obj) {
      if (obj.type === "tree") {
        if (path[path.length - 1] !== "/") {
          return { redirect: path + "/" };
        }
        var tree = decodeTree(obj.data);
        var index = tree['index.html'];
        if (index) {
          path += "index.html";
          return load(index.hash).then(renderObj);
        }
        return {
          code: 200,
          mime: "application/json",
          body: JSON.stringify(tree, null, 2)
        };
      }
      var body = obj.data;
      return {
        code: 200,
        mime: guess(path, body),
        body: body,
      };
    }
  });
}


// Start the event loop.
require('uv').run();
