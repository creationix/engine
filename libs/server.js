"use strict";
var Server = require('web').Server;
var guess = require('mime');
var indexOf = require('bintools').indexOf;
var binToStr = require('bintools').binToStr;
var slice = require('bintools').slice;

var indexes = [
  "index.html",
  "index.js",
];

// Serve application over HTTP
return function serve(vfs) {
  var port = nucleus.getenv("PORT");
  port = port ? parseInt(port) : 8080;

  var server = new Server();
  server.use(require('web-log'));
  server.use(require('web-auto-headers'));

  server.bind({
    port: port
  });

  if (vfs.update) {
    server.route({
      method: "POST",
      path: "/update-hook",
    }, function (req, res) {
      return vfs.update().then(function (result) {
        res.code = 200;
        res.headers.set("Content-Type", "application/json");
        res.body = JSON.stringify(result, null, 2) + "\n";
      });
    });
  }

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
  return server;
}

function render(vfs, path) {
  return vfs.stat(path).then(function (meta) {
    if (!meta) return;
    if (meta.type === "file" || meta.type === "blob") {
      return renderFile(vfs, path, meta);
    }
    if (meta.type === "tree" || meta.type === "directory") {
      return renderFolder(vfs, path);
    }
  });
}

function renderFile(vfs, path, meta) {
  return vfs.readFile(path).then(function (body) {
    if (body == null) return;
    if (meta.mode & 1) {
      var index = indexOf(body, ";\n\n");
      if (index >= 0) {
        var config = binToStr(body, 0, index);
        var match = config.match(/^([_a-z0-9]+)\(([\s\S]*)\)$/);
        if (match) {
          var name = match[1];
          var args = eval("[" + match[2] + "]");
          args.push(slice(body, index + 3));
          return renderScript(vfs, path, name, args);
        }
      }
    }
    return {
      code: 200,
      mime: guess(path, body),
      body: body,
    };
  });
}

function renderScript(vfs, path, name, args) {
  var interpreterPath = "interpreters/" + name + ".js";
  return vfs.readFile(interpreterPath).then(function (code) {
    if (!code) throw new Error("No such interpreter: " + interpreterPath);
    code = "" + code;
    var interpreter = nucleus.compileFunction(""+code, interpreterPath);
    return interpreter.apply(null, args);
  });
}

function renderFolder(vfs, path) {
  if (path[path.length - 1] !== "/") {
    return { redirect: path + "/" };
  }
  return vfs.readTree(path).then(function (tree) {
    if (!tree) return;
    for (var i = 0, l = indexes.length; i < l; i++) {
      var index = indexes[i];
      if (tree[index]) return render(vfs, path + index);
    }
    return {
      code: 200,
      mime: "application/json",
      body: JSON.stringify(tree, null, 2) + "\n"
    };
  });
}
