"use strict";

var bintools = require('bintools');
var binToHex = bintools.binToHex;

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

  return function (chunk, offset) {
    if (!chunk) return;
    return state(chunk, offset);
  }

  // 4 byte signature "PACK"  <50 41 43 4b>
  // 4 byte version number    <00 00 00 02>
  // 4 byte number of objects <xx xx xx xx>
  function $header(chunk, offset) {
    // Wait till we have at least 12 bytes
    if (chunk.length < offset + 12) return;
    // Verify the first 8 bytes to be as expected
    if (!(
      chunk[offset + 0] == 0x50 && chunk[offset + 1] == 0x41 &&
      chunk[offset + 2] == 0x43 && chunk[offset + 3] == 0x4b &&
      chunk[offset + 4] == 0x00 && chunk[offset + 5] == 0x00 &&
      chunk[offset + 6] == 0x00 && chunk[offset + 7] == 0x02)) {
        throw new Error("Bad header in packfile");
    }
    // Read the number of objects in the stream.
    count = ((chunk[offset + 8] << 24) |
          (chunk[offset + 9] << 16) |
          (chunk[offset + 10] << 8) |
          chunk[offset + 11]) >>> 0;
    state = $objhead;
    return [
      { version: 2,
        count: count },
      offset + 12
    ];
  }

  function $objhead(chunk, offset) {
    if (!chunk || chunk.length < offset + 1) return;
    // p(count);
    var typeId = (chunk[offset] >> 4) & 0x07;
    var type = numToType[typeId];
    if (!type) throw new Error("Invalid type ID: " + typeId);
    var length = chunk[offset] & 0x0f;
    if (chunk[offset++] & 0x80) {
      var bits = 4;
      do {
        if (chunk.length <= offset) return;
        length |= chunk[offset] << bits;
        bits += 7;
      } while (chunk[offset++] & 0x80);
    }

    var ref;
    if (type === "ref-delta") {
      if (chunk.length < offset + 20) return;
      ref = binToHex(chunk, offset, offset += 20);
    }
    else if (type === "ofs-delta") {
      throw new Error("TODO: Implement ofs-delta");
      // var byte = chunk[offset++];
      // ref = byte & 0x7f;
      // while (byte & 0x80) {
      //   byte = chunk[offset++];
      //   ref = ((ref + 1) << 7) | (byte & 0x7f);
      // }
    }
    // p(type, length, offset, ref, chunk);
    var out = nucleus.zinflate(chunk, offset, length);
    if (!out) return;
    count--;
    if (count <= 0) {
      state = $done;
    }
    var obj = {
      type: type,
      data: out[0],
    };
    if (ref) obj.ref = ref;
    return [obj, out[1] + offset];
  }

  function $done(chunk, offset) {
    // throw new Error("TODO:")
    // TODO: verify checksum
    offset += 20;
    return [undefined, offset];
  }

}
