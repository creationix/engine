var bintools = require('bintools');
var strToBin = bintools.strToBin,
    binToStr = bintools.binToStr,
    binToRaw = bintools.binToRaw,
    rawToBin = bintools.rawToBin,
    indexOf = bintools.indexOf,
    parseDec = bintools.parseDec,
    slice = bintools.slice;

return {
  encode: encode,
  decode: decode,
};

// Values come in, Uint8Array comes out
function encode(value) {
  if (value === undefined) return;
  return realEncode(value);
}

function realEncode(value) {
  if (value === null) {
    return '*-1\r\n';
  }
  else if (typeof value === 'number') {
    return ':' + value + '\r\n';
  }
  else if (value instanceof Error) {
    return '-' + value.message + '\r\n';
  }
  else if (Array.isArray(value)) {
    return ['*' + value.length + '\r\n', value.map(realEncode)];
  }
  else {
    if (!(value instanceof Uint8Array)) {
      value = strToBin('' + value);
    }
    return ['$' + value.length + '\r\n', value, '\r\n'];
  }
}

// Uint8Array comes in, [value, extra] comes out.
// Extra is undefined if there was no extra input.
function decode(chunk) {
  if (!chunk) return;
  var out = innerDecode(chunk, 0);
  if (!out) return;
  return (out[1] < chunk.length) ?
    [out[0], slice(chunk, out[1])] :
    [out[0]];
}

function innerDecode(chunk, offset) {
  if (chunk.length <= offset) return;
  var index, len;
  switch(chunk[offset]) {
    case 43: { // '+' Simple string
      index = indexOf(chunk, '\r\n', offset);
      if (index < 0) return;
      return [
        slice(chunk, offset + 1, index),
        index + 2
      ];
    }
    case 45: { // '-' Error
      index = indexOf(chunk, '\r\n', offset);
      if (index < 0) return;
      return [
        new Error(binToStr(chunk, offset + 1, index)),
        index + 2
      ];
    }
    case 58: { // ':' Integer
      index = indexOf(chunk, '\r\n', offset);
      if (index < 0) return;
      return [
        parseDec(chunk, offset + 1, index),
        index + 2
      ];
    }
    case 36: { // '$' Bulk String
      index = indexOf(chunk, '\r\n', offset);
      if (index < 0) return;
      len = parseDec(chunk, offset + 1, index);
      if (len < 0) return [
        null,
        index + 2
      ];
      var start = index + 2,
          end = start + len;
      if (chunk.length < end + 2) return;
      return [
        slice(chunk, start, end),
        end + 2
      ];
    }
    case 42: { // '*' List
      index = indexOf(chunk, '\r\n', offset);
      if (index < 0) return;
      len = parseDec(chunk, offset + 1, index);
      if (len < 0) return [
        null,
        index + 2
      ];
      var list = [];
      offset = index + 2;
      while (len--) {
        var out = innerDecode(chunk, offset);
        if (!out) return;
        list.push(out[0]);
        offset = out[1];
      }
      return [
        list,
        offset
      ];
    }
    default: {
      index = indexOf(chunk, '\r\n', offset);
      if (index < 0) return;
      return [
        binToRaw(chunk, offset, index).split(' ').map(rawToBin),
        index + 2
      ];
    }
  }
}
