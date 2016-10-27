"use strict";
// Bootstrap require system and inject builtin globals
nucleus.dofile("builtins/index.js");

// Load some nucleus APIs
var pathjoin = nucleus.pathjoin;
var uv = nucleus.uv;


// Manually include some dns entries till seaduk adds dns bindings.
var dns = {
  "github.com": "192.30.253.112",
  "localhost": "127.0.0.1",
};

if (nucleus.args[0]) {
  initialize(nucleus.args[0]).then(require('server')).catch(p);
}
else {
  var cmd = nucleus.cmd;
  print("Usage:");
  print("  " + cmd + " git://github.com/creationix/conquest.git # Serve from git repo");
  print("  " + cmd + " path/to/checkout                         # Serve from filesystem");
  nucleus.exit(-1);
}

function initialize(url) {
  print("Initializing " + url + "...");
  var match = url.match(/^git:\/\/([^:\/]+)(?::([0-9]+))?([^#]*)(?:#(.+))?$/);
  if (match) {
    return require('git-vfs')({
      hostName: match[1],
      host: dns[match[1]] || match[1],
      port: match[2] ? parseInt(match[2]) : 9418,
      path: match[3],
      ref: match[4] || "HEAD"
    });
  }
  return Promise.resolve(require('fs-vfs')(pathjoin(
    uv.cwd(), url)
  ));
}

// Start the event loop.
require('uv').run();
