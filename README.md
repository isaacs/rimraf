The [UNIX command](http://en.wikipedia.org/wiki/Rm_(Unix)) `rm -rf` for node.

Install with `npm install rimraf`, or just drop rimraf.js somewhere.

## Major Changes from v3 to v4

* The function returns a `Promise` instead of taking a callback.
* Built-in glob support removed.
* Functions take arrays of paths, as well as a single path.
* Native implementation used by default when available.
* New implementation on Windows, making the exponential backoff for
  `EBUSY` and `ENOTEMPTY` errors no longer necessary.
* Simplified implementation on Posix, since the Windows affordances are not
  necessary there.

## API

### `rimraf(f, [opts]) -> Promise`

This first parameter is a path.  The second argument is an options object.

Options:

* `tmp`: Temp folder to use to place files and folders for the Windows
  implementation.  Must be on the same physical device as the path being
  deleted.  Defaults to `dirname(f)`.
* `preserveRoot`: If set to boolean `false`, then allow the recursive
  removal of the root directory.  Otherwise, this is not allowed.

Any other options are provided to the native Node.js `fs.rm` implementation
when that is used.

This will attempt to choose the best implementation, based on Node.js
version and `process.platform`.  To force a specific implementation, use
one of the other functions provided.

### `rimraf.sync(f, [opts])` `rimraf.rimrafSync(f, [opts])`

Synchronous form of `rimraf()`

Note that, unlike many file system operations, the synchronous form will
typically be significantly _slower_ than the async form, because recursive
deletion is extremely parallelizable.

### `rimraf.native(f, [opts])`

Uses the built-in `fs.rm` implementation that Node.js provides.  This is
used by default on Node.js versions greater than or equal to `14.14.0`.

### `rimraf.nativeSync(f, [opts])` `rimraf.native.sync(f, [opts])`

Synchronous form of `rimraf.native`

### `rimraf.manual(f, [opts])`

Use the JavaScript implementation appropriate for your operating system.

### `rimraf.manualSync(f, [opts])` `rimraf.manualSync(f, opts)`

Synchronous form of `rimraf.manual()`

### `rimraf.windows(f, [opts])`

JavaScript implementation of file removal appropriate for Windows
platforms, where `unlink` and `rmdir` are not atomic operations.

Moves all files and folders to the parent directory of `f` with a temporary
filename prior to attempting to remove them.

Note that, in cases where the operation fails, this _may_ leave files lying
around in the parent directory with names like
`.file-basename.txt.0.123412341`.  Until the Windows kernel provides a way
to perform atomic `unlink` and `rmdir` operations, this is unfortunately
unavoidable.

To move files to a different temporary directory other than the parent,
provide `opts.tmp`.  Note that this _must_ be on the same physical device
as the folder being deleted, or else the operation will fail.

### `rimraf.windows.sync(path, [opts])` `rimraf.windowsSync(path, [opts])`

Synchronous form of `rimraf.windows()`

## mkdirp

If you need to _create_ a directory recursively, check out
[mkdirp](https://github.com/isaacs/node-mkdirp).
