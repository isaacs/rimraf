# 4.3

- Return boolean indicating whether the path was fully removed
- Add filter option
- bin: add --verbose, -v to print files as they are deleted
- bin: add --no-verbose, -V to not print files as they are deleted
- bin: add -i --interactive to be prompted on each deletion
- bin: add -I --no-interactive to not be prompted on each
  deletion

# v4.2

- Brought back `glob` support, using the new and improved glob v9

# v4.1

- Improved hybrid module with no need to look at the `.default`
  dangly bit. `.default` preserved as a reference to `rimraf`
  for compatibility with anyone who came to rely on it in v4.0.
- Accept and ignore `-rf` and `-fr` arguments to the bin.

# v4.0

- Remove `glob` dependency entirely. This library now only
  accepts actual file and folder names to delete.
- Accept array of paths or single path.
- Windows performance and reliability improved.
- All strategies separated into explicitly exported methods.
- Drop support for Node.js below version 14
- rewrite in TypeScript
- ship CJS/ESM hybrid module
- Error on unknown arguments to the bin. (Previously they were
  silently ignored.)

# v3.0

- Add `--preserve-root` option to executable (default true)
- Drop support for Node.js below version 6

# v2.7

- Make `glob` an optional dependency

# 2.6

- Retry on EBUSY on non-windows platforms as well
- Make `rimraf.sync` 10000% more reliable on Windows

# 2.5

- Handle Windows EPERM when lstat-ing read-only dirs
- Add glob option to pass options to glob

# 2.4

- Add EPERM to delay/retry loop
- Add `disableGlob` option

# 2.3

- Make maxBusyTries and emfileWait configurable
- Handle weird SunOS unlink-dir issue
- Glob the CLI arg for better Windows support

# 2.2

- Handle ENOENT properly on Windows
- Allow overriding fs methods
- Treat EPERM as indicative of non-empty dir
- Remove optional graceful-fs dep
- Consistently return null error instead of undefined on success
- win32: Treat ENOTEMPTY the same as EBUSY
- Add `rimraf` binary

# 2.1

- Fix SunOS error code for a non-empty directory
- Try rmdir before readdir
- Treat EISDIR like EPERM
- Remove chmod
- Remove lstat polyfill, node 0.7 is not supported

# 2.0

- Fix myGid call to check process.getgid
- Simplify the EBUSY backoff logic.
- Use fs.lstat in node >= 0.7.9
- Remove gently option
- remove fiber implementation
- Delete files that are marked read-only

# 1.0

- Allow ENOENT in sync method
- Throw when no callback is provided
- Make opts.gently an absolute path
- use 'stat' if 'lstat' is not available
- Consistent error naming, and rethrow non-ENOENT stat errors
- add fiber implementation
