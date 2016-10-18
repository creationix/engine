var connect = require('net').connect;
var pktLine = require('pkt-line');

return {
  lsRemote: lsRemote
};

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
    return write("git-upload-pack " + path);
  }).then(function () {
    return read();
  }).then(onLine);

  function onLine(line) {
    if (!line) return refs;
    if (!refs) {
      var parts = line.split("\0");
      line = parts[0];
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
