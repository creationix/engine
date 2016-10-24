// Bootstrap require system and inject builtin globals
nucleus.dofile("builtins/index.js");


// Load the git network client to get remotes
var fetch = require('git').fetch;
var sha1 = nucleus.sha1;
var hexEncode = nucleus.hexEncode;
var redisConnect = require('redis-client');
var bintools = require('bintools');
var flatten = bintools.flatten;
var binToStr = bintools.binToStr;
var slice = bintools.slice;
var parseDec = bintools.parseDec;
var indexOf = bintools.indexOf;

function redisStorage() {
  return redisConnect().then(function (call) {
    function save(obj) {
      var framed = flatten([obj.type + " " + obj.data.length + "\0", obj.data]);
      var hash = hexEncode(sha1(framed));
      p(hash, obj);
      return call("set", hash, framed).then(function () {
        return hash;
      });
    }
    function load(hash) {
      return call("get", hash).then(function (framed) {
        var index = indexOf(framed, " ");
        var type = binToStr(framed, 0, index);
        var index2 = indexOf(framed, "\0", index);
        var length = parseDec(framed, index + 1, index2);
        var data = slice(framed, index2 + 1);
        if (data.length !== length) throw new Error("Size Mismatch");
        return {
          type: type,
          data: data
        };
      });
    }
    return {
      load: load,
      save: save
    };
  });
}

function memStorage() {
  var objects = {};

  return Promise.resolve({
    load: load,
    save: save
  });
  // obj.type, obj.data -> hash
  function save(obj) {
    var framed = flatten([obj.type + " " + obj.data.length + "\0", obj.data]);
    var hash = hexEncode(sha1(framed));
    objects[hash] = obj;
    p(hash, obj);
    return Promise.resolve(hash);
  }

  // hash -> obj.type obj.data
  function load(hash) {
    return Promise.resolve(objects[hash]);
  }

}

redisStorage().then(function (storage) {
  p("storage", storage)
  return fetch("127.0.0.1", "/creationix/conquest.git", "refs/heads/master", storage.load, storage.save);
}).then(function (hashes){
  print("Done!");
  p(hashes);
}).catch(p);

// var lsRemote = require('git').lsRemote;
// lsRemote("127.0.0.1", "/creationix/revision.git").then(p).catch(print);
// lsRemote("127.0.0.1", "/creationix/exploder.git").then(p).catch(print);

// Start the event loop.
require('uv').run();
