// Bootstrap require system and inject builtin globals
nucleus.dofile("builtins/index.js");

// Load the git network client to get remotes
var lsRemote = require('git').lsRemote;

lsRemote("127.0.0.1", "/creationix/conquest.git").then(p).catch(print);
lsRemote("127.0.0.1", "/creationix/revision.git").then(p).catch(print);
lsRemote("127.0.0.1", "/creationix/exploder.git").then(p).catch(print);

// Start the event loop.
require('uv').run();
