"use strict";

var bintools = require('bintools');
var slice = bintools.slice;

var typeToNum = {
  commit: 1,
  tree: 2,
  blob: 3,
  tag: 4,
  "ofs-delta": 6,
  "ref-delta": 7
};
var numToType = [];
for (var type in typeToNum) {
  var num = typeToNum[type];
  numToType[num] = type;
}

return {
  decoder: packDecoder,
};

function packDecoder() {
  var state = $header;
  var count;

  return function (chunk) {
    return state(chunk);
  }

  // 4 byte signature "PACK"  <50 41 43 4b>
  // 4 byte version number    <00 00 00 02>
  // 4 byte number of objects <xx xx xx xx>
  function $header(chunk) {
    // Wait till we have at least 12 bytes
    if (chunk.length < 12) return;
    // Verify the first 8 bytes to be as expected
    if (!(
      chunk[0] == 0x50 && chunk[1] == 0x41 &&
      chunk[2] == 0x43 && chunk[3] == 0x4b &&
      chunk[4] == 0x00 && chunk[5] == 0x00 &&
      chunk[6] == 0x00 && chunk[7] == 0x02)) {
        throw new Error("Bad header in packfile");
    }
    // Read the number of objects in the stream.
    count = ((chunk[8] << 24) |
          (chunk[9] << 16) |
          (chunk[10] << 8) |
          chunk[11]) >>> 0;
    state = $objhead;
    return [
      { version: 2,
        count: count },
      slice(chunk, 12)
    ];
  }

  function $objhead(chunk) {
    if (!chunk || chunk.length < 1) return;
    p(count);
    var typeId = (chunk[0] >> 4) & 0x07;
    var type = numToType[typeId] || typeId;
    var length = chunk[0] & 0x0f;
    var i = 1;
    if (chunk[0] & 0x80) {
      var offset = 4;
      do {
        if (chunk.length <= i) return;
        length |= chunk[i] << offset;
        offset += 7;
      } while (chunk[i++] & 0x80);
    }

    var ref;
    if (type === "ref-delta") {
      if (chunk.length < i + 20) return;
      ref = slice(chunk, i, i += 20);
    }
    else if (type === "ofs-delta") {
      var byte = chunk[i++];
      ref = byte & 0x7f;
      while (byte & 0x80) {
        byte = chunk[i++];
        ref = ((ref + 1) << 7) | (byte & 0x7f);
      }
    }
    p(type, length, i, ref, chunk);
    var out = nucleus.inflate(chunk, i, length);
    if (!out) return;
    count--;
    var obj = {
      type: type,
      data: out[0],
    };
    if (ref) obj.ref = ref;
    return [obj, slice(chunk, out[1] + i)];
  }
}
