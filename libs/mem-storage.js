var sha1 = nucleus.sha1;
var hexEncode = nucleus.hexEncode;
var bintools = require('bintools');
var flatten = bintools.flatten;

return function memStorage() {
  var objects = {};

  return Promise.resolve({
    load: load,
    save: save
  });
  // obj.type, obj.data -> hash
  function save(obj) {
    var framed = flatten([obj.type + " " + obj.data.length + "\0", obj.data]);
    var hash = hexEncode(sha1(framed));
    objects[hash] = obj;
    p(hash, obj);
    return Promise.resolve(hash);
  }

  // hash -> obj.type obj.data
  function load(hash) {
    return Promise.resolve(objects[hash]);
  }

}
