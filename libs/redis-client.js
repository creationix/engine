"use strict";

var connect = require('net').connect;
var redisCodec = require('redis-codec');

return function (options) {
  return connect({
    host: (options && options.host) || "127.0.0.1",
    port: (options && options.port) || 6379,
    encode: redisCodec.encode,
    decode: redisCodec.decode,
  }).then(function (client) {
    var read = client.read,
        write = client.write;
    return function call() {
      var args = [].slice.call(arguments);
      return write(args).then(read);
    }
  });
}
