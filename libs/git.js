var connect = require('net').connect;
var pktLine = require('pkt-line');

return {
  lsRemote: lsRemote,
  fetch: fetch,
};

function fetch(host, path, ref) {
  var read, write, caps, hash;
  var packParts;
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
    if (line ===  true) return write("want " + hash + "\0ofs-delta agent=seaduk-git\n").then(function () {
      return write(true);
    }).then(function () {
      return write("done");
    }).then(function () {
      return read();
    }).then(function (nak) {
      if (nak.trim() !== "NAK") {
        throw new Error("Missing expected NAK");
      }
      packParts = [];
      read.updateDecode();
      write.updateEncode();
      return read().then(onPack);
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

  function onPack(chunk) {
    if (!chunk) return write().then(function () {
      return packParts;
    });
    packParts.push(chunk);
    return read().then(onPack);
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
