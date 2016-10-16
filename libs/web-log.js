return function (req, res, next) {
  var userAgent = req.headers.get("User-Agent");

  // Run all inner layers first.
  return next().then(after);

  // And then log after everything is done
  function after() {
    if (userAgent) {
      // Skip this layer for clients who don't send User-Agent headers.
      print([req.method, req.path, userAgent, res.code].join(' '));
    }
  }
}
