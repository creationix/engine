var uv = nucleus.uv;
var p = nucleus.dofile('pretty-print.js').prettyPrint;
nucleus.dofile('setimmediate.js');
nucleus.dofile('promiscuous.js');
var delay = nucleus.dofile('delay.js');
var guessMime = nucleus.dofile('mime.js');
var base = "/home/tim/creationix.com";

p(nucleus);

// If the first 1 bit of the byte is 0,that character is 1 byte width and this is the byte.
// If the first 2 bit of the byte is 10,that byte is not the first byte of a character
// If the first 3 bit is 110,that character is 2 byte width and this is the first byte
// If the first 4 bit is 1110,that character is 3 byte width and this is the first byte
// If the first 5 bit is 11110,that character is 4 byte width and this is the first byte
// If the first 6 bit is 111110,that character is 5 byte width and this is the first byte
function isUTF8(bin) {
  var i = 0, l = bin.length;
  while (i < l) {
    if (bin[i] < 0x80) i++;
    else if (bin[i] < 0xc0) return false;
    else if (bin[i] < 0xe0) i += 2;
    else if (bin[i] < 0xf0) i += 3;
    else if (bin[i] < 0xf8) i += 4;
    else if (bin[i] < 0xfc) i += 5;
  }
  return i === l;
}


function pcall(fn) {
  var args = [].slice.call(arguments, 1);
  return Promise(function (fulfill, reject) {
    args.push(function (err, result) {
      if (err) {
        if (err.message.match("^ENOENT:")) return fulfill();
        return reject(err);
      }
      return fulfill(result);
    });
    return fn.apply(null, args);
  })
}

function close(fd) {
  return pcall(uv.fs_close, fd);
}

function open(path, flags, mode) {
  return pcall(uv.fs_open, path, flags || "r", mode || 438);
}

function read(fd, len, offset) {
  return pcall(uv.fs_read, fd, len, offset || -1);
}

function scandir(path) {
  return pcall(uv.fs_scandir, path);
}
function stat(path) {
  return pcall(uv.fs_stat, path);
}
function fstat(path) {
  return pcall(uv.fs_fstat, path);
}

uv.fs_load_file = function fs_load_file(path, callback) {
  var fd;
  return uv.fs_open(path, "r", 438, onOpen);

  function onOpen(err, result) {
    if (err) return callback(err);
    fd = result;
    return uv.fs_fstat(fd, onStat);
  }

  function onStat(err, meta) {
    if (err) return onRead(err);
    return uv.fs_read(fd, meta.size, -1, onRead);
  }

  function onRead(err, data) {
    uv.fs_close(fd);
    if (err) return callback(err);
    return callback(null, data);
  }
}

function loadFile(path) {
  return pcall(uv.fs_load_file, path);
}


var pathjoin = nucleus.pathjoin;
// Given path as input, return {
//   code: http status code
//   body?: http response body
//   mime?: http mimetype
// }
function render(path) {
  path = pathjoin(base, path);
  return stat(path).then(onStat);

  function onStat(s) {
    if (!s) return { code: 404, body: "No such file: " + path }
    if (s.type === "directory") {
      if (path[path.length - 1] !== "/") return {
        code: 301,
        redirect: path + "/"
      };
      return scandir(path).then(onDir);
    }
    return loadFile(path).then(onFile);
  }

  function onFile(data) {
    return {
      code: 200,
      body: data,
      mime: guessMime(path, function () {
        return isUTF8(data)
      })
    }
  }

  function onDir(list) {
    if (list["index.html"]) {
      path = pathjoin(path, "index.html");
      return loadFile(path).then(onFile);
    }
    return { code: 500, body: "TODO: render directory index"};
  }
  // return scandir(base).then(function (files) {
  //   p(files);
  //   return open(nucleus.pathjoin(base, path));
  // }).then(function (fd) {
  //   p({fd:fd});
  //   return read(fd, 100).then(function (data) {
  //     p({data:data, str:""+data});
  //     return close(fd);
  //   });
  // }).then(function (success) {
  //   p({success:success});
  // });
  // print("Before");
  // delay(450).then(function (out) {
  //   print("After");
  //   fulfill(out);
  // })
}

render("/").then(process).then(p).catch(print);
render("/modules").then(process).then(p).catch(print);
render("/modules/").then(process).then(p).catch(print);
render("/oops").then(process).then(p).catch(print);

function process(res) {
  if (res.body) {
    var isText = (typeof res.body === "string") || isUTF8(res.body);
    if (!res.mime) res.mime = isText? guessMime.defaultText : guessMime.defaultBinary;
    if (!res.length) res.length = res.body.length;
  }
  return res;
}

uv.run();
