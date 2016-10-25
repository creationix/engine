"use strict";

var Buffer = Duktape.Buffer;

return {
  indexOf: indexOf,
  binToRaw: binToRaw,
  rawToBin: rawToBin,
  binToHex: binToHex,
  hexToBin: hexToBin,
  binToStr: binToStr,
  strToBin: strToBin,
  strToRaw: strToRaw,
  rawToStr: rawToStr,
  slice: slice,
  flatten: flatten,
  parseDec: parseDec,
  parseOct: parseOct,
  parseHex: parseHex,
};

// indexOf for arrays/buffers.  Raw is a string in raw encoding.
// returns -1 when not found.
// start and end are indexes into buffer.  Default is 0 and length.
function indexOf(bin, raw, start, end) {
  start = start == null ? 0 : start | 0;
  end = end == null ? bin.length : end | 0;
  outer: for (var i = start || 0; i < end; i++) {
    for (var j = 0, l = raw.length; j < l; j++) {
      if (i + j >= end || bin[i + j] !== raw.charCodeAt(j)) {
        continue outer
      }
    }
    return i;
  }
  return -1;
}

function binToRaw(bin, start, end) {
  if (!(bin instanceof Buffer)) {
    bin = Buffer(bin);
  }
  start = start == null ? 0 : start | 0;
  end = end == null ? bin.length : end | 0;
  var raw = '';
  for (var i = start || 0; i < end; i++) {
    raw += String.fromCharCode(bin[i]);
  }
  return raw;
}

// Convert a raw string into a Buffer
function rawToBin(raw, start, end) {
  raw = '' + raw
  start = start == null ? 0 : start | 0
  end = end == null ? raw.length : end | 0
  var len = end - start
  var bin = Buffer(len)
  for (var i = 0; i < len; i++) {
    bin[i] = raw.charCodeAt(i + start)
  }
  return bin
}

function strToBin(str) {
  return rawToBin(strToRaw(str))
}

function binToStr(bin, start, end) {
  return rawToStr(binToRaw(bin, start, end))
}

function strToRaw(str) {
  return unescape(encodeURIComponent(str))
}

function rawToStr(raw) {
  return decodeURIComponent(escape(raw))
}


function slice(bin, start, end) {
  if (start == null) start = 0;
  if (end == null) end = bin.length;
  if (end <= start) return;
  var copy = Buffer(end - start);
  for (var i = start; i < end; i++) {
    copy[i - start] = bin[i];
  }
  return copy;
}

// This takes nested lists of numbers, strings and array buffers and returns
// a single buffer.  Numbers represent single bytes, strings are raw 8-bit
// strings, and buffers represent themselves.
// EX:
//    1           -> <01>
//    "Hi"        -> <48 69>
//    [1, "Hi"]   -> <01 48 69>
//    [[1],2,[3]] -> <01 02 03>
function flatten(parts) {
  if (typeof parts === "number") return Buffer([parts])
  if (parts instanceof Buffer) return parts
  var buffer = Buffer(count(parts))
  copy(buffer, 0, parts)
  return buffer
}

function count(value) {
  if (value == null) return 0;
  if (typeof value === "number") return 1;
  if (typeof value === "string") return value.length;
  if (value instanceof Buffer) return value.length;
  if (value.constructor === Duktape.Buffer) return value.length;
  if (!Array.isArray(value)) {
    throw new TypeError("Bad type for flatten: " + typeof value);
  }
  var sum = 0;
  for (var i = 0, l = value.length; i < l; i++) {
    var piece = value[i];
    sum += count(piece);
  }
  return sum;
}

function copy(buffer, offset, value) {
  if (value == null) return offset;
  if (typeof value === "number") {
    buffer[offset++] = value;
    return offset;
  }
  var i, l;
  if (typeof value === "string") {
    for (i = 0, l = value.length; i < l; i++) {
      buffer[offset++] = value.charCodeAt(i);
    }
    return offset;
  }
  if (value instanceof ArrayBuffer) {
    value = Buffer(value);
  }
  for (i = 0, l = value.length; i < l; i++) {
    var piece = value[i];
    offset = copy(buffer, offset, piece);
  }
  return offset;
}

function parseDec(bin, start, end) {
  var val = 0, sign = 1;
  if (bin[start] === 0x2d) {
    start++;
    sign = -1;
  }
  while (start < end) {
    val = val * 10 + bin[start++] - 0x30;
  }
  return sign * val;
}

function parseOct(bin, start, end) {
  var val = 0;
  while (start < end) {
    val = val * 8 + bin[start++] - 0x30;
  }
  return val;
}

function parseHex(bin, start, end) {
  var val = 0;
  while (start < end) {
    var digit = bin[start++];
    val = (val << 4) | (digit - ((digit < 0x40) ? 0x30 : 0x57));
  }
  return val;
}

function binToHex(bin, start, end) {
  if (!(bin instanceof Buffer)) bin = Buffer(bin)
  start = start == null ? 0 : start | 0
  end = end == null ? bin.length : end | 0
  var hex = ''
  for (var i = start; i < end; i++) {
    var byte = bin[i]
    hex += (byte < 0x10 ? '0' : '') + byte.toString(16)
  }
  return hex
}

function hexToBin(hex, start, end) {
  hex = '' + hex
  start = start == null ? 0 : start | 0
  end = end == null ? hex.length : end | 0
  var len = (end - start) >> 1
  var bin = Buffer(len)
  var offset = 0
  for (var i = start; i < end; i += 2) {
    bin[offset++] = parseInt(hex.substr(i, 2), 16)
  }
  return bin
}
