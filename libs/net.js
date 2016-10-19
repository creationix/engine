"use strict";

var Tcp = require('uv').Tcp;
var genChannel = require('gen-channel');
var makeRead = genChannel.makeRead,
    makeWrite = genChannel.makeWrite;

return {
  createServer: createServer,
  connect: connect,
};

function createServer(options, onConnection) {
  var server = new Tcp();
  server.bind(options.host || "127.0.0.1", options.port);
  server.listen(128, function (err) {
    if (err) return onConnection(err);
    var socket = new Tcp();
    server.accept(socket);
    onConnection(null, {
      read: makeRead(socket, options.decode),
      write: makeWrite(socket, options.encode),
      socket: socket
    });
  });
  return server;
}

function connect(options) {
  return new Promise(function (resolve, reject) {
    var socket = new Tcp();
    socket.connect(options.host || "127.0.0.1", options.port, function (err) {
      if (err) return reject(err);
      var read = makeRead(socket, options.decode);
      var write = makeWrite(socket, options.encode);
      resolve({
        read: read,
        write: write,
        socket: socket
      });
    });
  });
}
