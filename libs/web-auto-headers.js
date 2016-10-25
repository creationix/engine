"use strict";

var parseQuery = require('web-helpers').parseQuery;
var flatten = require('bintools').flatten;
var hexEncode = nucleus.hexEncode;
var sha1 = nucleus.sha1;

return function autoHeaders(req, res, next) {
  var isHead = false;
  if (req.method === 'HEAD') {
    req.method = 'GET';
    isHead = true;
  }

  var match = req.path.match(/^([^?]*)\??(.*)/);
  var pathname = match[1],
      query = match[2];
  req.pathname = pathname;
  if (query) {
    req.query = parseQuery(query);
  }

  if (req.body) {
    req.body = flatten(req.body);
  }

  var requested = req.headers.get('If-None-Match');

  return next().then(after);

  function after() {
    var headers = res.headers;
    if (!headers.has("Server")) {
      headers.add("Server", "Seaduk-Web");
    }
    if (!headers.has("X-Powered-By")) {
      headers.add("X-Powered-By", "Seaduk");
    }
    if (!headers.has("Date")) {
      headers.add("Date", new Date().toUTCString());
    }
    if (!headers.has("Connection")) {
      headers.add("Connection", req.keepAlive ? "Keep-Alive" : "Close");
    }
    res.keepAlive = headers.has("Connection") &&
      headers.get("Connection").toLowerCase() === "keep-alive";

    if (res.body) {
      var body = res.body = flatten(res.body);
      var needLength = !(headers.has("Content-Length") ||
                         headers.has("Transfer-Encoding"));
      if (needLength) {
        headers.set("Content-Length", "" + body.length);
      }
      if (!headers.has("ETag")) {
        var hash = hexEncode(sha1(body));
        headers.set("ETag", '"' + hash + '"');
      }
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "text/plain");
      }
    }

    var etag = headers.get("ETag");
    if (requested && res.code >=200 && res.code < 300 && requested === etag) {
      res.code = 304;
      res.body = null;
    }

    if (isHead) {
      req.method = "HEAD";
      res.body = null;
    }
  }
}
