// promise based delay for seaduk
// by Tim Caswell
(function delay(ms) { return Promise(function (fulfill) {
  var timer = new nucleus.uv.Timer();
  return timer.start(ms, ms, function () {
    timer.close()
    return fulfill();
  });
})})
