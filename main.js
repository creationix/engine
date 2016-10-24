// Bootstrap require system and inject builtin globals
nucleus.dofile("builtins/index.js");


// Load the git network client to get remotes
var fetch = require('git').fetch;
var redisStorage = require('redis-storage');

Promise.all([
  // "/creationix/conquest.git",
  "/creationix/exploder.git",
  // "/creationix/creationix.com.git",
  // "/nucleus-js/seaduk.git",
].map(function (path) {
  return redisStorage().then(function (storage) {
    return storage.call("get", path).then(function (root) {
      root = root && root.toString();
      return fetch({
        host: "192.30.253.113", // github.com
        have: root,
        // host: "127.0.0.1",
        path: path,
        load: storage.load,
        save: storage.save,
      }).then(function (result) {
        p(path, result.root);
        if (result.root === root) {
          print("No updates");
          return;
        }
        print("Updated to " + result.root);
        return storage.call("set", path, result.root);
      });
    }).then(function () {
      return storage.call.write();
    });
  })
})).catch(p);

// Start the event loop.
require('uv').run();
