// setImmediate for seaduk
// by Tim Caswell
setImmediate = (function () {
  "use strict";

  var uv = nucleus.uv;
  var checker = new uv.Check();
  var idler = new uv.Idle();
  var deferQueue = [];
  var read = 0;
  var write = 0;
  checker.unref();
  idler.unref();
  return setImmediate;

  function onCheck() {
    while (write > read) {
      var fn = deferQueue[read];
      deferQueue[read++] = undefined;
      fn();
    }
    idler.stop();
    checker.stop();
  }

  function setImmediate(fn) {
    if (write <= read) {
      checker.start(onCheck);
      idler.start(onCheck);
    }
    deferQueue[write++] = fn;
  }

}())
