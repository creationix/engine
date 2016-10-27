var redisStorage = require('redis-storage');
var git = require('git');
var decodeCommit = git.decodeCommit;
var decodeTree = git.decodeTree;
var fetch = git.fetch;

// Implementation of engine api on top of a git tree (used by git publishing)

// api.readFile(path: string): Promise<Buffer|undefined>
// api.stat(path: string): Promise<{entry|undefined>

return function makeVfs(options) {

  var url = "git://" + options.hostName + options.path;
  if (options.ref !== "HEAD") url += "#" + options.ref;

  var rootHash, cache;

  return update().then(function () {
    return {
      update: update,
      stat: stat,
      readFile: readFile,
      readTree: readTree,
    }
  });

  function update() {
    p("Fetching updates for " + url);
    return redisStorage().then(function (storage) {
      return storage.call("get", url).then(function (root) {
        root = root && root.toString();
        return fetch({
          host: options.host,
          hostName: options.hostName,
          ref: options.ref,
          path: options.path,
          have: root,
          load: storage.load,
          save: storage.save,
        }).then(function (result) {
          cache = {};
          rootHash = result.root;
          if (result.root === root) {
            print("No updates");
            return result;
          }
          print("Updated to " + result.root);
          return storage.call("set", url, result.root).then(function () {
            return result;
          });
        });
      }).then(function (result) {
        return storage.free().then(function () {
          return result;
        });
      });
    });
  }

  // Load and decode a git object.  Trees, commits, and small blobs are cached.
  function load(hash) {
    var cached = cache[hash];
    if (cached) return Promise.resolve(cached);
    return redisStorage().then(function (storage) {
      return storage.load(hash).then(function (obj) {
        storage.free();
        if (obj.type === "tree") {
          return cache[hash] = { tree: decodeTree(obj.data) };
        }
        if (obj.type === "commit") {
          return cache[hash] = { commit: decodeCommit(obj.data) };
        }
        if (obj.type === "blob") {
          var result = { blob: obj.data };
          if (obj.data.length < 0x1000) cache[hash] = result;
          return result;
        }
      });
    });
  }

  // Given a path, resolve to a git entry or undefined if no such file.
  function pathToEntry(path) {
    var parts = path.split("/").filter(Boolean);
    var index = 0, last = parts.length;
    return load(rootHash).then(onObject);
    function onObject(obj) {
      if (!obj) return;
      if (obj.commit) return load(obj.commit.tree).then(onObject);
      if (index === last) return obj;
      var part = parts[index++];
      if (obj.tree) {
        var entry = obj.tree[part];
        if (entry) return load(entry.hash).then(onObject);
      }
    }
  }

  function stat(path) {
    var match = path.match(/^(.*?)([^\/]+)\/*$/);
    if (!match) return Promise.resolve({type:"tree",hash:rootHash});
    return pathToEntry(match[1]).then(function (entry) {
      return entry && entry.tree && entry.tree[match[2]];
    });
  }

  function readFile(path) {
    return pathToEntry(path).then(function (entry) {
      return entry && entry.blob;
    });
  }

  function readTree(path) {
    return pathToEntry(path).then(function (entry) {
      return entry && entry.tree;
    });
  }
}
