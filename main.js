"use strict";
// Bootstrap require system and inject builtin globals
nucleus.dofile("builtins/index.js");

var Server = require('web').Server;
var fetch = require('git').fetch;
var redisStorage = require('redis-storage');
var guess = require('mime');

// Global config
// TODO: pull these from command line or environment variables.
// var path = "/creationix/creationix.com.git";
// var ref = "refs/heads/www";
var path = "/creationix/conquest.git";
var ref = "refs/heads/master";

var rootHash;

pull().then(serve).catch(p);
// serve();


// Serve application over HTTP
function serve() {
  // var vfs = require('git-vfs')(rootHash);
  var vfs = require('fs-vfs')(nucleus.pathjoin(nucleus.base, 'app'));
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
    });
  });

  server.use(function (req, res, next) {
    return render(vfs, req.pathname).then(function (response) {
      if (!response) return next();
      var defaultCode = 404;
      if (response.mime) res.headers.set("Content-Type", response.mime);
      if (response.redirect) {
        defaultCode = 301;
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

function render(vfs, path) {
  return vfs.stat(path).then(function (meta) {
    if (!meta) return;
    if (meta.type === "file" || meta.type === "blob") {
      return renderFile(vfs, path);
    }
    if (meta.type === "tree" || meta.type === "directory") {
      return renderFolder(vfs, path);
    }
  });
}

function renderFile(vfs, path) {
  return vfs.readFile(path).then(function (body) {
    if (body == null) return;
    return {
      code: 200,
      mime: guess(path, body),
      body: body,
    };
  });
}

function renderFolder(vfs, path) {
  if (path[path.length - 1] !== "/") {
    return { redirect: path + "/" };
  }
  return vfs.readTree(path).then(function (tree) {
    if (!tree) return;
    if (tree["index.html"]) {
      return renderFile(vfs, path + "index.html");
    }
    return {
      code: 200,
      mime: "application/json",
      body: JSON.stringify(tree, null, 2) + "\n"
    };
  });
}


// Start the event loop.
require('uv').run();
