"use strict";

var bintools = require('bintools');
var parseHex = bintools.parseHex,
    binToStr = bintools.binToStr,
    strToBin = bintools.strToBin;

return {
  encode: pktLineEncode,
  decode: pktLineDecode,
};

function pktLineDecode(chunk, offset) {
  if (!chunk) return;
  var clen = chunk.length;
  if (clen < 4 + offset) return;
  var length = parseHex(chunk, offset, offset + 4);
  if (clen < length) return;
  if (length === 0) {
    return [ true, offset + 4 ];
  }
  return [
    binToStr(chunk, offset + 4, offset + length),
    offset + length
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
