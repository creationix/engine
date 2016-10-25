"use strict";

return function logger(req, res, next) {
  var userAgent = req.headers.get("User-Agent");
  var method = req.method;
  var path = req.path;

  // Run all inner layers first.
  return next().then(after);

  // And then log after everything is done
  function after() {
    if (userAgent) {
      // Skip this layer for clients who don't send User-Agent headers.
      print([method, path, userAgent, res.code].join(' '));
    }
  }
}
