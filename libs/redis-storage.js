"use strict";

var sha1 = nucleus.sha1;
var hexEncode = nucleus.hexEncode;
var redisConnect = require('redis-client');
var git = require('git');
var frame = git.frame;
var deframe = git.deframe;
var assert = require('assert');

return function redisStorage() {
  return redisConnect().then(function (call) {
    function save(obj) {
      assert(obj &&
        typeof obj === "object" &&
        typeof obj.type === "string" &&
        typeof obj.data === "buffer", "Invalid object to save");
      var framed = frame(obj);
      var hash = hexEncode(sha1(framed));
      return call("set", hash, framed).then(function () {
        p(hash, obj)
        return hash;
      });
    }
    function load(hash) {
      assert(
        typeof hash === "string" &&
        /^[0-9a-f]{40}$/.test(hash), "Invalid hash");
      return call("get", hash).then(function (framed) {
        if (!framed) throw new Error("No such hash: " + hash);
        return deframe(framed);
      });
    }
    return {
      load: load,
      save: save,
      call: call,
    };
  });
}
