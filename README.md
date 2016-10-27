# Goals

- Blog Engine where writing is simply creating markdown files and publishing is
  simply a git push.
- Ability to author blog articles in website
- Ability to implement blog comments
- Ability to implement real-time chat with persistence and custom channels like
  social media.

- Full express-like routes as JS files including websocket routes
- template engine based on json-ml





## Channels
 - emit(name, value)
 - when(name) -> Promise<value>

## Mutable Storage
 - get(key) -> value
 - set(key, value)

## Content Addressable Storage
 - load(hash) -> value
 - store(value) -> hash



--------------------------------------------------------------------------------

- static file server
- follow symlinks
- auto-index folders (render as html or json depending on accept?)
- add trailing slash to folders using redirect
- exec files are evaluated in js sandbox
  - result is cached with invalidation defined by api calls made
