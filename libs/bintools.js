"use strict";

return {
  indexOf: indexOf,
  binToRaw: binToRaw,
  rawToBin: rawToBin,
  slice: slice,
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
