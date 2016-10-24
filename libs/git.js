"use strict";

var connect = require('net').connect;
var pktLine = require('pkt-line');
var packCodec = require('pack-codec');
var binToHex = require('bintools').binToHex;

return {
  lsRemote: lsRemote,
  fetch: fetch,
};

function fetch(host, path, ref, load, save) {
  var hashes = [];
  var read, write, caps, hash;
  ref = ref || "HEAD";

  return connect({
    host: host,
    port: 9418,
    encode: pktLine.encode,
    decode: pktLine.decode,
  }).then(function (client) {
    read = client.read;
    write = client.write;
    return write("git-upload-pack " + path + "\0host=" + host + "\0");
  }).then(function () {
    return read();
  }).then(onLine);

  function onLine(line) {
    if (line === true) return write("want " + hash + "\0agent=seaduk-git\n").then(function () {
      return write(true);
    }).then(function () {
      return write("done");
    }).then(function () {
      return read();
    }).then(function (nak) {
      if (nak.trim() !== "NAK") {
        throw new Error("Missing expected NAK");
      }
      p("upgrade to packfile")
      read.updateDecode(packCodec.decoder());
      write.updateEncode();
      return read().then(onSummary);
    });
    if (!caps) {
      var parts = line.split("\0");
      line = parts[0];
      caps = parseCaps(parts[1]);
    }
    var match = line.match(/^([0-9a-z]{40}) ([^\n]+)/);
    if (match[2] === ref) hash = match[1];
    return read().then(onLine);
  }

  function onSummary(summary) {
    p("summary", summary);
    return read().then(onObject);
  }

  function onObject(obj) {
    p("obj", obj)
    if (!obj) return hashes;
    if (!obj.ref) return save(obj).then(onSave);
    return load(obj.ref).then(function (base) {
      return save({
        type: base.type,
        data: applyDelta(obj.data, base.data)
      }).then(onSave);
    });
  }
  function onSave(hash) {
    hashes.push(hash);
    return read().then(onObject);
  }

}

function lsRemote(host, path) {
  var read, write, refs;

  return connect({
    host: host,
    port: 9418,
    encode: pktLine.encode,
    decode: pktLine.decode,
  }).then(function (client) {
    read = client.read;
    write = client.write;
    return write("git-upload-pack " + path + "\0host=" + host + "\0");
  }).then(function () {
    return read();
  }).then(onLine);

  function onLine(line) {
    if (line === true) return write(true).then(function () {
      return refs;
    });
    if (!refs) {
      var parts = line.split("\0");
      line = parts[0];
      p(parseCaps(parts[1]))
      refs = {};
    }
    var match = line.match(/^([0-9a-z]{40}) ([^\n]+)/);
    refs[match[2]] = match[1];
    return read().then(onLine);
  }
}

function parseCaps(line) {
  var caps = {};
  var parts = line.trim().split(' ');
  for (var i = 0, l = parts.length; i < l; i++) {
    var part = parts[i];
    var pair = part.split("=");
    caps[pair[0]] = pair[1] || true;
  }
  return caps;
}

function applyDelta(delta, base) {
  var deltaOffset = 0;

  if (base.length !== readLength()) {
    throw new Error("Base length mismatch");
  }

  // Create a new output buffer with length from header.
  var outOffset = 0;
  var out = Duktape.Buffer(readLength());

  while (deltaOffset < delta.length) {
    var byte = delta[deltaOffset++];
    // Copy command.  Tells us offset in base and length to copy.
    if (byte & 0x80) {
      var offset = 0;
      var length = 0;
      if (byte & 0x01) offset |= delta[deltaOffset++] << 0;
      if (byte & 0x02) offset |= delta[deltaOffset++] << 8;
      if (byte & 0x04) offset |= delta[deltaOffset++] << 16;
      if (byte & 0x08) offset |= delta[deltaOffset++] << 24;
      if (byte & 0x10) length |= delta[deltaOffset++] << 0;
      if (byte & 0x20) length |= delta[deltaOffset++] << 8;
      if (byte & 0x40) length |= delta[deltaOffset++] << 16;
      if (length === 0) length = 0x10000;
      // copy the data
      copy(out, outOffset, base, offset, length);
      outOffset += length;
    }
    // Insert command, opcode byte is length itself
    else if (byte) {
      copy(out, outOffset, delta, deltaOffset, byte);
      deltaOffset += byte;
      outOffset += byte;
    }
    else throw new Error('Invalid delta opcode');
  }

  if (outOffset !== out.length) {
    throw new Error("Size mismatch in check");
  }

  return out;

  // Read a variable length number our of delta and move the offset.
  function readLength() {
    var byte = delta[deltaOffset++];
    var length = byte & 0x7f;
    var shift = 7;
    while (byte & 0x80) {
      byte = delta[deltaOffset++];
      length |= (byte & 0x7f) << shift;
      shift += 7;
    }
    return length;
  }
}

function copy(target, targetOffset, source, sourceOffset, length) {
  for (var i = 0; i < length; i++) {
    target[targetOffset + i] = source[sourceOffset + i];
  }
}
