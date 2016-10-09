(function () {

var uv = nucleus.uv;

// These are used by defer
var checker = new uv.Check();
var idler = new uv.Idle();
var deferQueue = [];
var read = 0;
var write = 0;
checker.unref();
idler.unref();

T.defer = defer;
T.all = all;
T.delay = delay;

return T;

function T(task) {
  return function (cb, eb) {
    var done = false;
    var sync = true;
    try {
      print("Start task", task)
      task(onValue, onError);
      sync = false;
    }
    catch (error) {
      onError(error);
    }
    function onValue(value) {
      if (done) return;
      if (sync) return defer(onValue, value);
      print("Fulfill task", task)
      done = true;
      return cb(value);
    }
    function onError(error) {
      if (done) return;
      if (sync) return defer(onError, error);
      print("Fail task", task)
      done = true;
      return eb(error);
    }
  };
}

function onCheck() {
  while (write > read) {
    var item = deferQueue[read];
    deferQueue[read++] = undefined;
    var fn = item.fn;
    fn(item.arg);
  }
  idler.stop();
  checker.stop();
}

function defer(fn, arg) {
  if (write <= read) {
    checker.start(onCheck);
    idler.start(onCheck);
  }
  deferQueue[write++] = {
    fn: fn,
    arg: arg
  };
}

function delay(ms) { return T(function (cb) {
  var timer = new uv.Timer();
  return timer.start(ms, ms, function () {
    timer.close()
    return cb();
  });
})}

function pool(limit) {
  var queue = [];
  var done
  return enqueue;
  function enqueue(task) {

  }
}

// Given a list of tasks, run them in parallel (with optional max concurrency)
// and return result.  If any single task fails, abort the entire list.
function all(tasks, limit) { return T(function (cb, eb) {
  if (limit == null) limit = 1/0;
  var abort = false;
  var done = 0;
  var started = 0;
  var length = tasks.length;
  var results = new Array(length);
  var checking = false;
  return check();
  function check() {
    if (abort) return;
    if (checking) return;
    checking = true;
    if (done >= length) return cb(results)
    while (started < length && started < done + limit && !abort) {
      (function () {
        var i = started;
        var fn = tasks[started++];
        fn(onDone, onError);
        function onDone(value) {
          if (abort) return;
          results[i] = value;
          done++;
          check();
        }
        function onError(error) {
          if (abort) return;
          abort = true;
          return eb(error);
        }
      })();
    }
    checking = false;
  }
})}

})()
