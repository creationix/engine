"use strict";

var bintools = require('bintools');
var parseHex = bintools.parseHex,
    slice = bintools.slice,
    binToStr = bintools.binToStr,
    strToBin = bintools.strToBin;

return {
  encode: pktLineEncode,
  decode: pktLineDecode,
};

function pktLineDecode(chunk) {
  if (!chunk) return;
  var clen = chunk.length;
  if (clen < 4) return;
  var length = parseHex(chunk, 0, 4);
  if (clen < length) return;
  if (length === 0) {
    return [ true, slice(chunk, 4) ];
  }
  return [
    binToStr(chunk, 4, length),
    slice(chunk, length)
  ];
}

function pktLineEncode(message) {
  if (message === undefined) return;
  if (message === true) return "0000";
  if (typeof message === "string") {
    message = strToBin(message);
  }
  var length = message.length + 4;
  var head = length.toString(16);
  head = "0000".substr(head.length) + head;
  return [head, message];
}
