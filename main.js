// Bootstrap require system and inject builtin globals
nucleus.dofile("builtins/index.js");

var connect = require('net').connect;
var pktLine = require('pkt-line');

lsRemote("127.0.0.1", "/creationix/conquest.git").then(p).catch(print);

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

connect({
  // host: "192.30.253.112", // github.com
  host: "127.0.0.1",
  port: 9418,
  encode: pktLine.encode,
  decode: pktLine.decode,
}).then(function (client) {
  p(client.socket.getpeername(), client.socket.getsockname());
}).catch(print);


// var server = new (require('web').Server);
// var binToStr = require('bintools').binToStr;
// var redisConnect = require('redis-client');
// var msgpack = require('msgpack');
//
// server.use(require('web-log'));
// server.use(require('web-auto-headers'));
//
// server.route({
//   path: "/:name",
// }, function (req, res) {
//   res.code = 200;
//   res.headers.set("Content-Type", "text/plain");
//   res.body = "Hello " + req.params.name + "\n";
// });
//
// server.start();
//
// redisConnect().then(function (call) {
//   return call("get", "name");
// }).then(function (result) {
//   p(binToStr(result));
// }).catch(function (err) {
//   print(err.stack);
// });
//
// var original = {name:"Tim",age:34,isProgrammer:true}
// var encoded = msgpack.encode(original);
// var decoded = msgpack.decode(encoded);
// p(original, encoded, decoded);



require('uv').run();


// var bintools = require('bintools');
// var rawToBin = bintools.rawToBin;
// var web = require('web');
//
// // Load a library for speaking the HTTP protocol.
// var httpCodec = require('http-codec');
// var encode = httpCodec.encoder();
// var decode = httpCodec.decoder();
//
// // Setup some test datas
// var chunks = [
//   {
//     code: 200,
//     headers: {
//       "Server": "Nucleus",
//       "X-Nucleus-Engine": nucleus.engine + " (" +
//         nucleus.versions[nucleus.engine] +
//       ")",
//       "Transfer-Encoding": "chunked",
//     }
//   },
//   "Hello World\n",
//   ""
// ];
//
// for (var i = 0, l = chunks.length; i < l; i++) {
//   var chunk = encode(chunks[i]);
//   p(chunk);
//   chunk = rawToBin(chunk);
//   p(chunk);
//   p(decode(chunk));
// }
//
// var req = {
//   method: "HEAD",
//   path: "/foo?name=Tim&age=34",
//   headers: [
//     ["Host", "localhost:8080"],
//     ["User-Agent", "Test client"]
//   ]
// };
//
// web.autoHeaders(req, function (req) {
//   p("REQ", req);
//   return {};
// });
//

// var input = Duktape.Buffer("GET / HTTP/1.1\r\nHost: test.io\r\n\r\n");
// p(input)

//
// var hashes = ["md5", "sha1", "sha256", "sha512"];
// for (var i = 0, l = hashes.length; i < l; i++) {
//   var name = hashes[i];
//   var hash = nucleus[name]("")
//   var hex = nucleus.hexEncode(hash)
//   p(name, hex, hash)
// }
// var message = "Hello World";
// var mask = nucleus.sha1(message);
// p(message, mask, nucleus.mask(message, mask))

// nucleus.dofile('setimmediate.js');
// nucleus.dofile('promiscuous.js');
// var guessMime = nucleus.dofile('mime.js');
// var base = "/home/tim/creationix.com";
//
// // p(sha1, nucleus.hexDecode(sha1("")));
// // sha1 = nucleus.sha1;
// // p(sha1, sha1(""));
// // p("md5", nucleus.md5, nucleus.hexEncode(nucleus.md5("")))
// //
// // function pcall(fn) {
// //   var args = [].slice.call(arguments, 1);
// //   return Promise(function (fulfill, reject) {
// //     args.push(function (err, result) {
// //       if (err) {
// //         if (err.message.match("^ENOENT:")) return fulfill();
// //         return reject(err);
// //       }
// //       return fulfill(result);
// //     });
// //     return fn.apply(null, args);
// //   })
// // }
// //
// // uv.fs_load_file = function fs_load_file(path, callback) {
// //   var fd;
// //   return uv.fs_open(path, "r", 438, onOpen);
// //
// //   function onOpen(err, result) {
// //     if (err) return callback(err);
// //     fd = result;
// //     return uv.fs_fstat(fd, onStat);
// //   }
// //
// //   function onStat(err, meta) {
// //     if (err) return onRead(err);
// //     return uv.fs_read(fd, meta.size, -1, onRead);
// //   }
// //
// //   function onRead(err, data) {
// //     uv.fs_close(fd);
// //     if (err) return callback(err);
// //     return callback(null, data);
// //   }
// // }
// //
// // function loadFile(path) {
// //   return pcall(uv.fs_load_file, path);
// // }
// //
// //
// // var pathjoin = nucleus.pathjoin;
// // // Given path as input, return {
// // //   code: http status code
// // //   body?: http response body
// // //   mime?: http mimetype
// // // }
// // function render(path) {
// //   path = pathjoin(base, path);
// //   return pcall(uv.fs_stat, path).then(onStat);
// //
// //   function onStat(s) {
// //     if (!s) return { code: 404, body: "No such file: " + path }
// //     if (s.type === "directory") {
// //       if (path[path.length - 1] !== "/") return {
// //         code: 301,
// //         redirect: path + "/"
// //       };
// //       return pcall(uv.fs_scandir, path).then(onDir);
// //     }
// //     return loadFile(path).then(onFile);
// //   }
// //
// //   function onFile(data) {
// //     return {
// //       code: 200,
// //       body: data,
// //       mime: guessMime(path, data)
// //     }
// //   }
// //
// //   function onDir(list) {
// //     if (list["index.html"]) {
// //       path = pathjoin(path, "index.html");
// //       return loadFile(path).then(onFile);
// //     }
// //     return { code: 500, body: "TODO: render directory index"};
// //   }
// // }
// //
// // render("/").then(process).then(p).catch(p);
// // render("/modules").then(process).then(p).catch(p);
// // render("/modules/").then(process).then(p).catch(p);
// // render("/oops").then(process).then(p).catch(p);
// //
// // function process(res) {
// //   if (res.body) {
// //     if (!res.mime) res.mime = guessMime("", res.body)
// //     if (!res.length) res.length = res.body.length;
// //   }
// //   return res;
// // }
// //
// // uv.run();
