function article(meta, content) {
  "use strict";

  var marked = require('marked');
  content = "# " + meta.title + "\n\n" +
    "Published on " + (new Date(meta.date)) + " by " + meta.author + "\n\n" +
    content;

  return {
    code: 200,
    mime: "text/html",
    body: marked(content)
  };
}
