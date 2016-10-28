"use strict";
var Server = require('web').Server;
var guess = require('mime');

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
      if ((meta.mode & 1) && /\.js$/i.test(path)) {
        return renderScript(vfs, path);
      }
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

function renderScript(vfs, path) {
  return vfs.readFile(path).then(function (code) {
    code = "function(load){" + code + "}";
    return nucleus.compileFunction(code, "web:" + path)(load);
  });
  function load(subPath) {
    return vfs.readFile(nucleus.pathjoin(path, "..", subPath));
  }
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
