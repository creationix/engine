"use strict";

var Tcp = require('uv').Tcp;
var httpCodec = require('http-codec');
var decoder = httpCodec.decoder,
    encoder = httpCodec.encoder;
var genChannel = require('gen-channel');
var makeRead = genChannel.makeRead,
    makeWrite = genChannel.makeWrite;
var flatten = require('bintools').flatten;
var websocketCodec = require('websocket-codec');
var encode = websocketCodec.encode,
    decode = websocketCodec.decode;
var helpers = require('web-helpers');
var compileRoute = helpers.compileRoute,
    compileGlob = helpers.compileGlob;

function Headers(raw) {
  raw = raw || [];
  this.entries = [];
  this.indexes = {};
  for (var i = 0, l = raw.length; i < l; i += 2) {
    this.add(raw[i], raw[i + 1]);
  }
}

Headers.prototype.indexOf = function indexOf(name) {
  name = name.toLowerCase();
  if (this.indexes.hasOwnProperty(name)) return this.indexes[name];
  return -1;
};

Headers.prototype.has = function has(name) {
  return this.indexes.hasOwnProperty(name.toLowerCase());
};

// Get the first header matching name
Headers.prototype.get = function get(name) {
  var index = this.indexOf(name);
  if (index < 0) return;
  return this.entries[index][1];
};

// Replace first header matching name (or append new header if not found)
Headers.prototype.set = function set(name, value) {
  var index = this.indexOf(name);
  if (index >= 0) this.entries[index][1] = value;
  else this.add(name, value);
};

// append new header, even if duplicate name already exists.
Headers.prototype.add = function add(name, value) {
  var index = this.entries.length;
  this.entries[index] = [name, value];
  this.indexes[name.toLowerCase()] = index;
};

// Convert back to raw format for use with http-codec
Object.defineProperty(Headers.prototype, "raw", {
  get: function getRaw() {
    var raw = [];
    for (var i = 0, l = this.entries.length; i < l; i++) {
      var entry = this.entries[i];
      raw.push(entry[0], entry[1]);
    }
    return raw;
  }
});

function Request(head, body) {
  head = head || {};
  this.method = head.method || 'GET';
  this.path = head.path || "/";
  this.version = head.version || 1.1;
  this.keepAlive = head.keepAlive || false;
  this.headers = new Headers(head.headers);
  this.body = body;
}

// Convert back to raw format for use with http-codec
Object.defineProperty(Request.prototype, "raw", {
  get: function getRaw() {
    return {
      method: this.method,
      path: this.path,
      version: this.version,
      keepAlive: this.keepAlive,
      headers: this.headers.raw
    };
  }
});

function Response(head) {
  head = head || {};
  this.code = head.code || 404;
  this.version = head.version || 1.1;
  this.reason = head.reason;
  this.keepAlive = head.keepAlive || false;
  this.headers = new Headers(head.headers);
}
Object.defineProperty(Response.prototype, "raw", {
  get: function getRaw() {
    return {
      code: this.code,
      reason: this.reason,
      version: this.version,
      keepAlive: this.keepAlive,
      headers: this.headers.raw
    };
  }
});

function Server() {
  this.layers = [];
  this.bindings = [];
}

Server.prototype.bind = function bind(options) {
  if (!options.host) options.host = "127.0.0.1";
  if (!options.port) options.port = 8080;
  this.bindings.push(options);
  return this;
};

Server.prototype.use = function use(layer) {
  this.layers.push(layer);
  return this;
};

Server.prototype.route = function route(options, layer) {
  var method = options.method;
  var path = options.path && compileRoute(options.path);
  var host = options.host && compileGlob(options.host);
  return this.use(function (req, res, next) {
    if (method && (req.method !== method)) return next();
    if (host && !host(req.headers.get("Host"))) return next();
    var params;
    if (path) {
      params = path(req.pathname);
      if (!params) return next();
    }
    req.params = params || {};
    return layer(req, res, next);
  });
};

Server.prototype.start = function start() {
  if (!this.bindings.length) this.bind({});
  print("Starting HTTP server...");
  for (var i = 0, l = this.bindings.length; i < l; i++) {
    var binding = this.bindings[i];
    var server = new Tcp();
    server.bind(binding.host, binding.port);
    server.listen(128, this.onConnection.bind(this, server));
    p(server.getsockname());
  }
  print("Ready.");
}

Server.prototype.onConnection = function onConnection(server, err) {
  if (err) throw err;
  var client = new Tcp();
  server.accept(client);
  var read = makeRead(client, decoder());
  var write = makeWrite(client, encoder());
  var head, body, chunk, req, res;
  var layers = this.layers;

  // Start processing the first request (we have a stream of requests)
  return read().then(onHead);

  function onHead(newHead) {
    head = newHead;
    body = [];
    // Read all the body chunks.
    return read().then(onChunk);
  }

  function onChunk(chunk) {
    if (!chunk || chunk.length === 0) return onRequest();
    body.push(chunk);
    return read().then(onChunk);
  }

  // Process the request using the middleware layers.
  function onRequest() {
    req = new Request(head, body);
    res = new Response();

    return runLayer(0).catch(function (err) {
      print(err.stack);
      res.code = 500;
      res.body = err.stack
    }).then(onResponse);
  }

  function runLayer(index) {
    return new Promise(function (resolve) {
      var layer = layers[index];
      resolve(layer && layer(req, res, function () {
        return runLayer(index + 1);
      }));
    });
  }

  function onResponse() {
    return write(res.raw).then(onWritten);
  }

  function onWritten() {
    if (res.upgrade) {
      read.updateDecode(decode);
      write.updateEncode(encode);
      return res.upgrade(req, read, write);
    }
    return write(res.body ? flatten(res.body) : "").then(onDone);
  }

  function onDone() {
    // If the socket was still open, look for another request.
    if (chunk) return read().then(onHead);
    // Otherwise close out the socket.
    client.close();
  }
}

return {
  Headers: Headers,
  Request: Request,
  Response: Response,
  Server: Server,
};
