(function (global) {
"use strict";

global.p = prettyPrint;
var Tty = nucleus.uv.Tty;

//var stdout = new Tty(1, false);
//var size = stdout.getWinsize();
//var width = size[0];
var width = 80;

// nice color theme using 256-mode colors
var theme = {};

theme.property  = "38;5;253";
theme.braces    = "38;5;247";
theme.sep       = "38;5;240";

theme.undefined = "38;5;244";
theme.boolean   = "38;5;220"; // yellow-orange
theme.number    = "38;5;202"; // orange
theme.string    = "38;5;34";  // darker green
theme.quotes    = "38;5;40";  // green
theme.escape    = "38;5;46";  // bright green
theme.function  = "38;5;129"; // purple
theme.cfunction = "38;5;161"; // purple-red
theme.thread    = "38;5;199"; // pink

theme.regexp    = "38;5;214"; // yellow-orange
theme.date      = "38;5;153"; // blue-purple

theme.null      = "38;5;27";  // dark blue
theme.object    = "38;5;27";  // blue
theme.buffer    = "38;5;39";  // blue2
theme.dbuffer   = "38;5;69";  // teal
theme.pointer   = "38;5;124"; // red

theme.error     = "38;5;196"; // bright red
theme.success   = "38;5;120;48;5;22";  // bright green
theme.failure   = "38;5;215;48;5;52";  // bright green
theme.highlight = "38;5;45;48;5;236";  // bright teal with grey background

var quote, quote2, obracket, cbracket, obrace, cbrace, comma, colon;

quote = colorize("quotes", '"', "string");
quote2 = colorize("quotes", '"');
obracket = colorize("braces", '[');
cbracket = colorize("braces", ']');
obrace = colorize("braces", '{');
cbrace = colorize("braces", '}');
comma = colorize("sep", ',');
colon = colorize("sep", ':');

function color(color_name) {
 return "\x1b[" + (color_name ? theme[color_name] : "0") + "m";
}

function colorize(color_name, string, reset_name) {
  return string;
  return color(color_name) + string + color(reset_name);
}

function dump(value) {

  var seen = [];
  return dumper(value, 0);
  function dumper(value, depth) {
    var type = typeof value;

    if (type === "undefined") {
      return colorize("undefined", "undefined");
    }
    if (value === null) {
      return colorize("null", "null");
    }
    if (type === "boolean") {
      return colorize("boolean", "" + value);
    }
    if (type === "number") {
      return colorize("number", "" + value);
    }
    if (type === "string") {
      var str = JSON.stringify(value);
      return (quote + str.substring(1, str.length - 1) + quote2).
        replace(/(\\u[0-9a-f]{4}|\\["\\/bfnrt])/g, function (match) {
          return colorize("escape", match, "string");
        });
    }
    var info = Duktape.info(value);
    if (type === "function") {
      var fname = value.name || info[1];
      // Native CFunctions don't have a .prototype property.
      if (value.prototype) {
        return colorize("function", "[Function " + fname + "]");
      }
      return colorize("cfunction", "[Native " + fname + "]");
    }
    var fullName = Object.prototype.toString.call(value);
    var name = fullName.substring(8, fullName.length - 1);
    if (name === "RegExp") {
      return colorize("regexp", "[RegExp " + value + "]");
    }
    if (name === "Thread") {
      return colorize("thread", "[Thread " + info[1] + "]");
    }
    if (name === "Buffer" || name === "Uint8Array") {
      var preview = Array.prototype.slice.call(value, 0, 20).map(function (byte) {
        return byte < 16 ? "0" + byte.toString(16) : byte.toString(16);
      }).join(" ");
      if (value.length > 20) { preview += "..."; }
      // Fixed buffers have undefined for info[4]
      if (info[4] === undefined) {
        return colorize("buffer", "[" + name + " " + preview + "]");
      }
      return colorize("dbuffer", "[" + name + " " + preview + "]");
    }
    if (name === "Pointer") {
      return colorize("pointer", "[Pointer " + info[1] + "]");
    }
    if (name === "Error") {
      return colorize("error", "[" + value.constructor.name + " " + value.stack + "]");
    }
    if (name === "Date") {
      return colorize("date", "[Date " + value + "]");
    }
    if (name === "String") {
      return colorize("string", "[String " + JSON.stringify(value) + "]");
    }
    if (name === "Number") {
      return colorize("number", "[Number " + value + "]");
    }
    if (name !== "Object" && name !== "Array" && name !== "global") {
      return colorize("object", "[" + name + " " + info[1] + "]");
    }
    if (typeof value.inspect === "function") {
      var out = value.inspect();
      if (out) return colorize("object", value.inspect());
    }

    var index = seen.indexOf(value);
    if (depth > 2 || index >= 0) {
      return colorize("object", "[" + name + " " + info[1] + "]");
    }
    seen.push(value);

    var parts, opener, closer;
    if (name === "Array") {
      opener = obracket;
      closer = cbracket;
      parts = value.map(function (item) {
        return dumper(item, depth + 1);
      });
    }
    else {
      opener = obrace;
      closer = cbrace;
      parts = Object.keys(value).map(function (key) {
        return colorize("property", key) + colon + " " + dumper(value[key], depth + 1);
      });
    }

    var line = opener + " " + parts.join(comma + " ") + " " + closer;
    var max = width - depth * 2;
    if (strip(line).length > max) {
      var lines = [];
      line = [];
      max -= 2;
      var left = max;
      parts.forEach(function (part) {
        var len = strip(part).length + 2;
        if (left < len) {
          if (line.length) {
            lines.push(line);
          }
          left = max;
          line = [];
        }
        line.push(part);
        left -= len;
      });
      if (line.length) {
        lines.push(line);
      }
      lines = lines.map(function (line) {
        return line.join(comma + " ");
      });

      line = opener + "\n  " + lines.join(comma + "\n").split("\n").join("\n  ") + "\n" + closer;
    }

    return line;
  }
}

function strip(string) {
  return string.replace(/\x1b\[[^m]*m/g, '');
}

//global.print = function () {
//  var line = [].join.call(arguments, " ") + "\r\n";
//  stdout.write(line);
//}

function prettyPrint() {
  print(Array.prototype.map.call(arguments, dump).join(" "));
}

return {
  prettyPrint: prettyPrint,
  dump: dump,
  color: color,
  colorize: colorize
};

}(this));
