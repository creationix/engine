"use strict";

var bintools = require('bintools');
var flatten = bintools.flatten;
var slice = bintools.slice;
// var binToRaw = bintools.binToRaw;

return {
  makeRead: makeRead,
  makeWrite: makeWrite,
};

function makeRead(socket, decode) {
  // If writer > reader, there is data to be read.
  // if reader > writer, there is data required.
  var queue = [];
  var reader = 0, writer = 0;

  var paused = true;

  // buffer to store leftover data between decoder calls.
  var buffer;

  var concat = (decode && decode.concat) || defaultConcat;

  read.updateDecode = updateDecode;

  return read;

  function updateDecode(newDecode) {
    decode = newDecode;
    concat = (decode && decode.concat) || defaultConcat;
  }

  function read() {
    // If there is pending data, return it right away.
    if (writer > reader) {
      var item = queue[reader++];
      if (item[0]) throw item[0];
      return Promise.resolve(item[1]);
    }

    // Make sure the data is flowing since we need it.
    if (paused) {
      // print("read-start");
      paused = false;
      socket.readStart(onRead);
    }

    // Wait for the data or a parse error.
    return new Promise(function (resolve, reject) {
      queue[reader++] = {
        resolve: resolve,
        reject: reject
      };
    });
  }

  function onRead(err, chunk) {
    // p("<*", err || chunk);
    if (err) return emit(err);
    if (!decode) return emit(null, chunk);
    try {
      buffer = buffer ? concat(buffer, chunk) : chunk;
      var offset = 0;
      var out;
      while ((out = decode(buffer, offset))) {
        offset = out[1];
        emit(null, out[0]);
        if (out[0] === undefined) break;
      }
      buffer = buffer && ((offset < buffer.length) ? slice(buffer, offset) : null);
    }
    catch (err) {
      return emit(err);
    }
    // print("Done parsing");
  }

  function emit(err, value) {
    // p("<-", err || value);
    // If there is a pending writer, give it the data right away.
    if (reader > writer) {
      var promise = queue[writer++];
      if (err) return promise.reject(err);
      else return promise.resolve(value);
    }

    // Pause the read stream if we're buffering data already.
    if (!paused && writer > reader) {
      paused = true;
      // print("read-stop");
      socket.readStop();
    }

    queue[writer++] = [err, value];
  }
}

function makeWrite(socket, encode) {

  write.updateEncode = updateEncode;

  return write;

  function updateEncode(newEncode) {
    encode = newEncode;
  }

  function write(value) {
    // p("->", value);
    return new Promise(function (resolve, reject) {
      if (encode) {
        value = Duktape.Buffer(flatten(encode(value)));
      }

      // p("*>", value, binToRaw(value));
      if (value) {
        socket.write(value, check);
      }
      else socket.shutdown(check);
      function check(err) {
        if (err) return reject(err);
        return resolve();
      }
    });
  }
}

function defaultConcat(buffer, chunk) {
  return flatten([buffer, chunk]);
}
