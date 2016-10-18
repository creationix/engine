module.exports = {
    "env": {
        "browser": false,
        "commonjs": true
    },
    "globals": {
      "DataView": false,
      "ArrayBuffer": false,
      "Uint8Array": false,
      "Uint32Array": false,
      "nucleus": false,
      "Duktape": false,
      "print": false,
      "Promise": true,
      "setImmediate": true,
      "p": true,
      "define": true,
      "require": true,
    },
    "extends": "eslint:recommended",

};
