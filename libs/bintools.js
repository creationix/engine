"use strict";

return {
  indexOf: indexOf,
  binToRaw: binToRaw,
  rawToBin: rawToBin,
  slice: slice,
  flatten: flatten,
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
  if (!(bin instanceof Uint8Array)) {
    bin = new Uint8Array(bin);
  }
  start = start == null ? 0 : start | 0;
  end = end == null ? bin.length : end | 0;
  var raw = '';
  for (var i = start || 0; i < end; i++) {
    raw += String.fromCharCode(bin[i]);
  }
  return raw;
}

// Convert a raw string into a Uint8Array
function rawToBin(raw, start, end) {
  raw = '' + raw
  start = start == null ? 0 : start | 0
  end = end == null ? raw.length : end | 0
  var len = end - start
  var bin = new Uint8Array(len)
  for (var i = 0; i < len; i++) {
    bin[i] = raw.charCodeAt(i + start)
  }
  return bin
}

function slice(bin, start, end) {
  if (start == null) start = 0;
  if (end == null) end = bin.length;
  if (end <= start) return;
  var copy = new Uint8Array(end - start);
  for (var i = start; i < end; i++) {
    copy[i - start] = bin[i];
  }
  p("copy", binToRaw(copy))
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
  if (typeof parts === "number") return new Uint8Array([parts])
  if (parts instanceof Uint8Array) return parts
  var buffer = new Uint8Array(count(parts))
  copy(buffer, 0, parts)
  return buffer
}

function count(value) {
  if (value == null) return 0;
  if (typeof value === "number") return 1;
  if (typeof value === "string") return value.length;
  if (value instanceof Uint8Array) return value.length;
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
    value = new Uint8Array(value);
  }
  for (i = 0, l = value.length; i < l; i++) {
    var piece = value[i];
    offset = copy(buffer, offset, piece);
  }
  return offset;
}
