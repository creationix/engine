(function (global) {
  "use strict";

  // Implement setImmediate needed by promiscuous.
  nucleus.dofile("builtins/setimmediate.js");
  // Implement Promise
  nucleus.dofile("builtins/promiscuous.js");

  var mods = {
    uv: nucleus.uv,
    "pretty-print": nucleus.dofile("builtins/pretty-print.js"),
  };

  global.require = function require(name) {
    var mod = mods[name];
    if (mod) return mod;
    var filename = "libs/" + name + ".js";
    var code = nucleus.readfile(filename);
    if (code == null) throw new Error("No such module: " + name);
    code = "function(){" + code + "}";
    var def = nucleus.compileFunction(code, filename);
    return mods[name] = def();
  }
}(this));
