"use strict";

return function assert(cond, message) {
  if (!cond) throw new Error(message || "assertion failed");
  return cond;
};
