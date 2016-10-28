var uv = require('uv');
var pathJoin = nucleus.pathjoin;

// api.readFile(path: string): Promise<Buffer|undefined>
// api.readTree(path: string): Promise<tree|undefined>
// api.stat(path: string): Promise<{entry|undefined>

return function makeVfs(rootPath) {

  return {
    stat: stat,
    readFile: readFile,
    readTree: readTree,
  };

  function stat(path) {
    return new Promise(function (resolve, reject) {
      path = pathJoin(rootPath, pathJoin(".", path));
      return uv.fs_stat(path, function (err, stat) {
        if (err) {
          if (/^ENOENT:/.test(err.message)) return resolve();
          return reject(err);
        }
        return resolve(stat);
      });
    });
  }

  function readFile(path) {
    return new Promise(function (resolve, reject) {
      path = pathJoin(rootPath, pathJoin(".", path));
      uv.fs_open(path, "r", 420, function (err, fd) {
        if (err) {
          if (/^ENOENT:/.test(err.message)) return resolve();
          return reject(err);
        }
        return uv.fs_fstat(fd, function (err, stat) {
          if (err) return onRead(err);
          return uv.fs_read(fd, stat.size, 0, onRead);
        })
        function onRead(err, data) {
          return uv.fs_close(fd, function () {
            if (err) return reject(err);
            return resolve(data);
          });
        }
      });
    });
  }

  function readTree(path) {
    return new Promise(function (resolve, reject) {
      path = pathJoin(rootPath, pathJoin(".", path));
      return uv.fs_scandir(path, function (err, entries) {
        if (err) {
          if (/^ENOENT:/.test(err.message)) return resolve();
          return reject(err);
        }
        var tree = {};
        for (var key in entries) {
          tree[key] = {type: entries[key]};
        }
        return resolve(tree);
      });
    });
  }
}
