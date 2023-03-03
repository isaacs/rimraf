The [UNIX command](<http://en.wikipedia.org/wiki/Rm_(Unix)>) `rm -rf` for node.

Install with `npm install rimraf`.

## Major Changes from v3 to v4

- The function returns a `Promise` instead of taking a callback.
- Built-in glob support removed.
- Functions take arrays of paths, as well as a single path.
- Native implementation used by default when available, except on
  Windows, where this implementation is faster and more reliable.
- New implementation on Windows, falling back to "move then
  remove" strategy when exponential backoff for `EBUSY` fails to
  resolve the situation.
- Simplified implementation on Posix, since the Windows
  affordances are not necessary there.

## API

Hybrid module, load either with `import` or `require()`.

```js
// default export is the main rimraf function, or use named imports
import rimraf from 'rimraf'
// or
const rimraf = require('rimraf')

// other strategies exported as well
import { rimraf, rimrafSync, native, nativeSync } from 'rimraf'
// or
const { rimraf, rimrafSync, native, nativeSync } = require('rimraf')
```

### `rimraf(f, [opts]) -> Promise`

This first parameter is a path or array of paths. The second
argument is an options object.

Options:

- `preserveRoot`: If set to boolean `false`, then allow the
  recursive removal of the root directory. Otherwise, this is
  not allowed.
- `tmp`: Windows only. Temp folder to use to place files and
  folders for the "move then remove" fallback. Must be on the
  same physical device as the path being deleted. Defaults to
  `os.tmpdir()` when that is on the same drive letter as the path
  being deleted, or `${drive}:\temp` if present, or `${drive}:\`
  if not.
- `maxRetries`: Windows and Native only. Maximum number of
  retry attempts in case of `EBUSY`, `EMFILE`, and `ENFILE`
  errors. Default `10` for Windows implementation, `0` for Native
  implementation.
- `backoff`: Windows only. Rate of exponential backoff for async
  removal in case of `EBUSY`, `EMFILE`, and `ENFILE` errors.
  Should be a number greater than 1. Default `1.2`
- `maxBackoff`: Windows only. Maximum total backoff time in ms to
  attempt asynchronous retries in case of `EBUSY`, `EMFILE`, and
  `ENFILE` errors. Default `200`. With the default `1.2` backoff
  rate, this results in 14 retries, with the final retry being
  delayed 33ms.
- `retryDelay`: Native only. Time to wait between retries, using
  linear backoff. Default `100`.
- `signal` Pass in an AbortSignal to cancel the directory
  removal. This is useful when removing large folder structures,
  if you'd like to limit the amount of time spent. Using a
  `signal` option prevents the use of Node's built-in `fs.rm`
  because that implementation does not support abort signals.

Any other options are provided to the native Node.js `fs.rm` implementation
when that is used.

This will attempt to choose the best implementation, based on Node.js
version and `process.platform`. To force a specific implementation, use
one of the other functions provided.

### `rimraf.sync(f, [opts])` `rimraf.rimrafSync(f, [opts])`

Synchronous form of `rimraf()`

Note that, unlike many file system operations, the synchronous form will
typically be significantly _slower_ than the async form, because recursive
deletion is extremely parallelizable.

### `rimraf.native(f, [opts])`

Uses the built-in `fs.rm` implementation that Node.js provides. This is
used by default on Node.js versions greater than or equal to `14.14.0`.

### `rimraf.nativeSync(f, [opts])` `rimraf.native.sync(f, [opts])`

Synchronous form of `rimraf.native`

### `rimraf.manual(f, [opts])`

Use the JavaScript implementation appropriate for your operating system.

### `rimraf.manualSync(f, [opts])` `rimraf.manualSync(f, opts)`

Synchronous form of `rimraf.manual()`

### `rimraf.windows(f, [opts])`

JavaScript implementation of file removal appropriate for Windows
platforms. Works around `unlink` and `rmdir` not being atomic
operations, and `EPERM` when deleting files with certain
permission modes.

First deletes all non-directory files within the tree, and then
removes all directories, which should ideally be empty by that
time. When an `ENOTEMPTY` is raised in the second pass, falls
back to the `rimraf.moveRemove` strategy as needed.

### `rimraf.windows.sync(path, [opts])` `rimraf.windowsSync(path, [opts])`

Synchronous form of `rimraf.windows()`

### `rimraf.moveRemove(path, [opts])`

Moves all files and folders to the parent directory of `path`
with a temporary filename prior to attempting to remove them.

Note that, in cases where the operation fails, this _may_ leave
files lying around in the parent directory with names like
`.file-basename.txt.0.123412341`. Until the Windows kernel
provides a way to perform atomic `unlink` and `rmdir` operations,
this is unfortunately unavoidable.

To move files to a different temporary directory other than the
parent, provide `opts.tmp`. Note that this _must_ be on the same
physical device as the folder being deleted, or else the
operation will fail.

This is the slowest strategy, but most reliable on Windows
platforms. Used as a last-ditch fallback by `rimraf.windows()`.

### `rimraf.moveRemove.sync(path, [opts])` `rimraf.moveRemoveSync(path, [opts])`

Synchronous form of `rimraf.moveRemove()`

### Command Line Interface

```
rimraf version 4.2.0

Usage: rimraf <path> [<path> ...]
Deletes all files and folders at "path", recursively.

Options:
  --                  Treat all subsequent arguments as paths
  -h --help           Display this usage info
  --preserve-root     Do not remove '/' recursively (default)
  --no-preserve-root  Do not treat '/' specially
  -G --no-glob        Treat arguments as literal paths, not globs (default)
  -g --glob           Treat arguments as glob patterns

  --impl=<type>       Specify the implementation to use.
                      rimraf: choose the best option
                      native: the built-in implementation in Node.js
                      manual: the platform-specific JS implementation
                      posix: the Posix JS implementation
                      windows: the Windows JS implementation
                      move-remove: a slower Windows JS fallback implementation

Implementation-specific options:
  --tmp=<path>        Folder to hold temp files for 'move-remove' implementation
  --max-retries=<n>   maxRetries for the 'native' and 'windows' implementations
  --retry-delay=<n>   retryDelay for the 'native' implementation, default 100
  --backoff=<n>       Exponential backoff factor for retries (default: 1.2)
```

## mkdirp

If you need to _create_ a directory recursively, check out
[mkdirp](https://github.com/isaacs/node-mkdirp).
