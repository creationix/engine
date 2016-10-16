"use strict";

return {
  parseQuery: parseQuery,
  compileGlob: compileGlob,
  compileRoute: compileRoute,
};

function parseQuery(query) {
  var params = {};
  if (!query) return params;
  var parts = query.split("&").filter(Boolean);
  for (var i = 0, l = parts.length; i < l; i++) {
    var part = parts[i];
    var match = part.match(/^([^=]+)=(.*)$/)
    if (!match) continue;
    var key = decodeURIComponent(match[1]),
        value = decodeURIComponent(match[2]);
    params[key] = value;
  }
  return params;
}

function escapeRegex(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function compileGlob(glob) {
  var reg = new RegExp(glob.split("*").map(escapeRegex).join(".*"));
  return function (string) {
    return reg.test(string)
  }
}

function compileRoute(route) {
  var names = [];
  var reg = new RegExp("^" + route.split(/(:[a-z0-9_]+:?)/).map(function (part, i) {
    if (i % 2) {
      if (part[part.length - 1] === ':') {
        names.push(part.substr(1, part.length - 2));
        return "(.+)";
      }
      names.push(part.substr(1));
      return "([^/]+)";
    }
    return escapeRegex(part);
  }).join("") + "$");
  return function (str) {
    var match = str.match(reg);
    if (!match) return;
    var params = {};
    for (var i = 0, l = names.length; i < l; i++) {
      params[names[i]] = match[i + 1];
    }
    return params;
  }
}
