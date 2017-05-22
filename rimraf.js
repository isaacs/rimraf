module.exports = rimraf

/**
 * Synchronous version of rimraf
 * It can remove stuff synchronously, too.  But that's not so good.  Use the async API.  It's better.
 * @name sync
 * @type {rimrafSync}
 */
rimraf.sync = rimrafSync

var assert = require("assert")
var path = require("path")
var fs = require("fs")
var glob = require("glob")

/**
 * Default glob options
 * @private
 * @type {globOptions}
 * @prop {boolean} [nosort=true]
 * @prop {boolean} [silent=true]
 */
var defaultGlobOpts = {
  nosort: true,
  silent: true
}
/**
 * @typedef globOptions
 * @type {object}
 * @prop {boolean} [nosort=true]
 * @prop {boolean} [silent=true]
 */

/**
 * @typedef rimrafOptions
 * @prop {function} [options.unlink=fs.unlink]
 * @prop {function} [options.chmod=fs.chmod]
 * @prop {function} [options.stat=fs.stat]
 * @prop {function} [options.lstat=fs.lstat]
 * @prop {function} [options.rmdir=fs.rmdir]
 * @prop {function} [options.readdir=fs.readdir]
 * @prop {function} [options.unlinkSync=fs.unlinkSync]
 * @prop {function} [options.chmodSync=fs.chmodSync]
 * @prop {function} [options.statSync=fs.statSync]
 * @prop {function} [options.lstatSync=fs.lstatSync]
 * @prop {function} [options.rmdirSync=fs.rmdirSync]
 * @prop {function} [options.readdirSync=fs.readdirSync]
 * @prop {boolean} [options.disableGlob=false]
 *   Set to any non-falsey value to disable globbing entirely.
 *   (Equivalent to setting `glob: false`.)
 * @prop {boolean} [options.glob=true]
 *   Set to `false` to disable [glob](http://npm.im/glob) pattern matching.
 *   Set to an object to pass options to the glob module.  The default
 *   glob options are `{ nosort: true, silent: true }`.
 *   Glob version 6 is used in this module.
 *   Relevant for both sync and async usage.
 * @prop {number} [options.maxBusyTries=3]
 *   If an `EBUSY`, `ENOTEMPTY`, or `EPERM` error code is encountered
 *   on Windows systems, then rimraf will retry with a linear backoff
 *   wait of 100ms longer on each try.  The default maxBusyTries is 3.
 *   Only relevant for async usage.
 * @prop {number} [options.emfileWait=1000]
 *   If an `EMFILE` error is encountered, then rimraf will retry
 *   repeatedly with a linear backoff of 1ms longer on each try, until
 *   the timeout counter hits this max.  The default limit is 1000.
 *   If you repeatedly encounter `EMFILE` errors, then consider using
 *   [graceful-fs](http://npm.im/graceful-fs) in your program.
 *   Only relevant for async usage.
 */

/**
 * For EMFILE handling
 * @private
 * @type {number}
 */
var timeout = 0

/**
 * Flag to check for Windows operating system
 * @private
 * @type {boolean}
 */
var isWindows = (process.platform === "win32")

/**
 * Creates defaults for rimraf
 * @private
 * @param {rimrafOptions} options
 * @param {globOptions} [options.glob=defaultGlobOpts]
 */
function defaults (options) {
  // These methods can be overwritten by `options`.
  // All methods + their synchronous versinons are will be mapped.
  var methods = [
    'unlink',
    'chmod',
    'stat',
    'lstat',
    'rmdir',
    'readdir'
  ]
  // Map all methods or use the defaut from `fs`
  methods.forEach(function(m) {
    options[m] = options[m] || fs[m]
    m = m + 'Sync'
    options[m] = options[m] || fs[m]
  })

  // Apply defaults and ensure validity of options
  options.maxBusyTries = options.maxBusyTries || 3
  options.emfileWait = options.emfileWait || 1000
  if (options.glob === false) {
    options.disableGlob = true
  }
  options.disableGlob = options.disableGlob || false
  options.glob = options.glob || defaultGlobOpts
}

/**
 * The first parameter will be interpreted as a globbing pattern for files. If you
 * want to disable globbing you can do so with `opts.disableGlob` (defaults to
 * `false`). This might be handy, for instance, if you have filenames that contain
 * globbing wildcard characters.
 *
 * The callback will be called with an error if there is one.  Certain
 * errors are handled for you:
 *
 * * Windows: `EBUSY` and `ENOTEMPTY` - rimraf will back off a maximum of
 *   `opts.maxBusyTries` times before giving up, adding 100ms of wait
 *   between each attempt.  The default `maxBusyTries` is 3.
 * * `ENOENT` - If the file doesn't exist, rimraf will return
 *   successfully, since your desired outcome is already the case.
 * * `EMFILE` - Since `readdir` requires opening a file descriptor, it's
 *   possible to hit `EMFILE` if too many file descriptors are in use.
 *   In the sync case, there's nothing to be done for this.  But in the
 *   async case, rimraf will gradually back off with timeouts up to
 *   `opts.emfileWait` ms, which defaults to 1000.
 *
 *  In order to use a custom file system library, you can override
 *  specific fs functions on the options object.
 *
 *  If any of these functions are present on the options object, then
 *  the supplied function will be used instead of the default fs
 *  method.
 *
 *  Sync methods are only relevant for `rimraf.sync()`, of course.
 * @param {string} p File or folder path (uses glob per default)
 * @param {rimrafOptions | function} options rimraf options or callback function
 * @param {function} cb Callback function after success or error
 * @example
 * rimraf('some-thing', require('some-custom-fs'), callback)
 */
function rimraf (p, options, cb) {
  // Allow skipping the second parameter.
  // Reassign options to callback and create empty object for options.
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  // Cover cases that create potential errors
  // Prevents errors for further operations.
  assert(p, 'rimraf: missing path')
  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
  assert.equal(typeof cb, 'function', 'rimraf: callback function required')
  assert(options, 'rimraf: invalid options argument provided')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')

  // Parameters are valid.
  // Apply options by calling the {defaults} function
  defaults(options)

  // Rimraf is ready to be used
  // Define flags and counters for further operations
  var busyTries = 0
  var errState = null
  var n = 0

  // Optinally disable glob
  if (options.disableGlob || !glob.hasMagic(p))
    return afterGlob(null, [p])

  // @todo describe operation
  options.lstat(p, function (er, stat) {
    if (!er)
      return afterGlob(null, [p])

    glob(p, options.glob, afterGlob)
  })

  /**
   * Continue function. Calls the callback with the `errState` or `er`
   * parameter. Does not do anything until the reverse counter `n` hits Zero.
   * This helper can be used to call a function at the end of a loop function
   * e.g. `array.forEach`.
   * Relies on a {number} `n` in the same scope.
   * @private
   * @param {null|Error} er
   */
  function next (er) {
    errState = errState || er
    if (--n === 0)
      cb(errState)
  }

  /**
   * Function to be called after the glob function.
   * @private
   * @param {null|Error} er
   * @param {array} results List of files or folders that were found by the glob function
   */
  function afterGlob (er, results) {
    // In case of an error call callbak and return
    if (er)
      return cb(er)

    // Set reverse counter to number of results found by glob function
    // If no results were found call callback and return
    n = results.length
    if (n === 0)
      return cb()


    results.forEach(
      /**
       * file handler
       * @private
       * @param {string} p File or folder path
       */
      function (p) {
      rimraf_(p, options, function CB (er) {
        // Error handling
        // Check for error code and retry in case of `EBUSY`, `ENOTEMPTY` or `EPERM`
        if (er) {
          if ((er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") &&
              busyTries < options.maxBusyTries) {
            busyTries ++
            // Add 100 ms for every try and try again,
            // with the same exact callback as this one.
            var time = busyTries * 100
            return setTimeout(function () {
              rimraf_(p, options, CB)
            }, time)
          }

          // This one won't happen if graceful-fs is used.
          if (er.code === "EMFILE" && timeout < options.emfileWait) {
            return setTimeout(function () {
              rimraf_(p, options, CB)
            }, timeout ++)
          }

          // File or foolder does not exist. There is no error but nothing to do.
          // Simply continue
          if (er.code === "ENOENT") er = null
        }

        // Reset timeout to Zero and call {next}
        timeout = 0
        next(er)
      })
    })
  }
}

/**
 * Two possible strategies.
 * 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
 * 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
 *
 * Both result in an extra syscall when you guess wrong.  However, there
 * are likely far more normal files in the world than directories.  This
 * is based on the assumption that a the average number of files per
 * directory is >= 1.
 *
 * If anyone ever complains about this, then I guess the strategy could
 * be made configurable somehow.  But until then, YAGNI.
 * @private
 * @param {string} p File or folder path
 * @param {object} options Custom settings object
 * @param {function} cb Callback function after success or error
 */
function rimraf_ (p, options, cb) {
  // Cover cases that create potential errors
  // Prevents errors for further operations.
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  // Sunos lets the root user unlink directories, which is weird.
  // so we have to lstat here and make sure it's not a dir.
  options.lstat(p, function (er, st) {
    if (er && er.code === "ENOENT")
      return cb(null)

    // Windows can EPERM on stat.
    // If issue occurs fix it.
    if (er && er.code === "EPERM" && isWindows)
      fixWinEPERM(p, options, er, cb)

    // If `st` exists and is validates as directory we can remove it and return.
    if (st && st.isDirectory())
      return rmdir(p, options, er, cb)

    // @todo describe operation
    options.unlink(p, function (er) {
      if (er) {
        if (er.code === "ENOENT")
          return cb(null)
        if (er.code === "EPERM")
          return (isWindows)
            ? fixWinEPERM(p, options, er, cb)
            : rmdir(p, options, er, cb)
        if (er.code === "EISDIR")
          return rmdir(p, options, er, cb)
      }
      return cb(er)
    })
  })
}

/**
 * Fixes permission errors for Windows operationg systems
 * @private
 * @param {string} p File or folder path
 * @param {object} options Custom settings object
 * @param {null|Error} er
 * @param {function} cb Callback function after success or error
 */
function fixWinEPERM (p, options, er, cb) {
  // Cover cases that create potential errors
  // Prevents errors for further operations.
  assert(p)
  assert(options)
  assert(typeof cb === 'function')
  if (er)
    assert(er instanceof Error)

  // Give read/write access to file or folder
  options.chmod(p, 666,
    /**
     * Callback
     * @param {null|Error} er2
     */
    function (er2) {
      // In case of error call callback.
      // If file or folder does not exist remove error and call with `null`
      if (er2)
        cb(er2.code === "ENOENT" ? null : er)
      else
        options.stat(p,
          /**
           * Callback
           * @todo describe function
           * @todo describe param:stats
           * @param {null|Error} er3
           * @param {object} stats
           */
          function(er3, stats) {
          if (er3)
            cb(er3.code === "ENOENT" ? null : er)
          else if (stats.isDirectory())
            rmdir(p, options, er, cb)
          else
            options.unlink(p, cb)
        })
    }
  )
}

/**
 * Synchronous version of windows permission fix
 * @private
 * @param {string} p File or folder path
 * @param {object} options Custom settings object
 * @param {null|Error} er
 */
function fixWinEPERMSync (p, options, er) {
  // Cover cases that create potential errors
  // Prevents errors for further operations.
  assert(p)
  assert(options)
  if (er)
    assert(er instanceof Error)

  // Try to get read/write access
  // If attempt fails because the file or folder does not exist return,
  // otherwise throw an error
  try {
    options.chmodSync(p, 666)
  } catch (er2) {
    if (er2.code === "ENOENT")
      return
    else
      throw er
  }

  // @todo describe operation
  try {
    var stats = options.statSync(p)
  } catch (er3) {
    if (er3.code === "ENOENT")
      return
    else
      throw er
  }

  // @todo describe operation
  if (stats.isDirectory())
    rmdirSync(p, options, er)
  else
    options.unlinkSync(p)
}


/**
 * Cross paltform rm function for directories
 * @private
 * @param {string} p Directory path
 * @param {object} options Custom settings object
 * @param {null|Error} originalEr
 * @param {function} cb Callback function after success or error
 */
function rmdir (p, options, originalEr, cb) {
  // Cover cases that create potential errors
  // Prevents errors for further operations.
  assert(p)
  assert(p)
  assert(options)
  if (originalEr)
    assert(originalEr instanceof Error)
  assert(typeof cb === 'function')

  // try to rmdir first, and only readdir on `ENOTEMPTY` or `EEXIST` (SunOS)
  // if we guessed wrong, and it's not a directory, then
  // raise the original error.
  options.rmdir(p, function (er) {
    if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM"))
      rmkids(p, options, cb)
    else if (er && er.code === "ENOTDIR")
      cb(originalEr)
    else
      cb(er)
  })
}

/**
 * Remove contained files or directories
 * @private
 * @param {string} p Directory path
 * @param {object} options Custom settings object
 * @param {function} cb Callback function after success or error
 */
function rmkids(p, options, cb) {
  // Cover cases that create potential errors
  // Prevents errors for further operations.
  assert(p)
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  // @todo describe operation
  options.readdir(p,
    /**
     * @todo describe function
     * @private
     * @param {null|Error} er
     * @param {array} files List of files to perform operations on
     */
    function (er, files) {
      if (er)
        return cb(er)
      var n = files.length
      if (n === 0)
        return options.rmdir(p, cb)
      // declare undefined errror state
      var errState
      files.forEach(
        /**
         * @todo describe function
         * @private
         * @param {string} f file name
         */
        function (f) {
          rimraf(path.join(p, f), options,
            /**
             * @todo describe function
             * @param {null|Error} er
             * @returns {undefined}
             */
            function (er) {
            if (errState)
              return
            if (er)
              return cb(errState = er)
            if (--n === 0)
              options.rmdir(p, cb)
          }
        )
      }
    )
  })
}


/**
 * Synchronous version for {rimraf}
 * this looks simpler, and is strictly *faster*, but will
 * tie up the JavaScript thread and fail on excessively
 * deep directory trees.
 * @todo describe function
 * @param {string} p File or folder path (uses glob per default)
 * @param {rimrafOptions} options
 */
function rimrafSync (p, options) {
  options = options || {}
  defaults(options)

  // Cover cases that create potential errors
  // Prevents errors for further operations.
  assert(p)
  assert(p, 'rimraf: missing path')
  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
  assert(options, 'rimraf: missing options')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')

  var results

  // If glob is not being used ensure that results is an array
  // @todo describe else
  if (options.disableGlob || !glob.hasMagic(p)) {
    results = [p]
  } else {
    try {
      options.lstatSync(p)
      results = [p]
    } catch (er) {
      results = glob.sync(p, options.glob)
    }
  }

  // Return if results were found
  if (!results.length)
    return

  // Loop through results
  // @todo describe loop operation
  for (var i = 0; i < results.length; i++) {
    var p = results[i]

    try {
      var st = options.lstatSync(p)
    } catch (er) {
      if (er.code === "ENOENT")
        return

      // Windows can EPERM on stat.  Life is suffering.
      if (er.code === "EPERM" && isWindows)
        fixWinEPERMSync(p, options, er)
    }

    try {
      // sunos lets the root user unlink directories, which is... weird.
      if (st && st.isDirectory())
        rmdirSync(p, options, null)
      else
        options.unlinkSync(p)
    } catch (er) {
      if (er.code === "ENOENT")
        return
      if (er.code === "EPERM")
        return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er)
      if (er.code !== "EISDIR")
        throw er

      rmdirSync(p, options, er)
    }
  }
}

/**
 * Synchronous version for {rmdir}
 * @private
 * @param {string} p Directiry path
 * @param {object} options Custom settings object
 * @param {null|Error} originalEr
 */
function rmdirSync (p, options, originalEr) {
  // Cover cases that create potential errors
  // Prevents errors for further operations.
  assert(p)
  assert(p)
  assert(options)
  if (originalEr)
    assert(originalEr instanceof Error)

  // @todo describe operation
  try {
    options.rmdirSync(p)
  } catch (er) {
    if (er.code === "ENOENT")
      return
    if (er.code === "ENOTDIR")
      throw originalEr
    if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")
      rmkidsSync(p, options)
  }
}

/**
 * Synchronous version for {rmkids}
 * @private
 * @param {string} p Directiry path
 * @param {object} options Custom settings object
 * @param {null|Error} originalEr
 */
function rmkidsSync (p, options) {
  // Cover cases that create potential errors
  // Prevents errors for further operations.
  assert(p)
  assert(p)
  assert(options)
  options.readdirSync(p).forEach(function (f) {
    rimrafSync(path.join(p, f), options)
  })

  // We only end up here once we got ENOTEMPTY at least once, and
  // at this point, we are guaranteed to have removed all the kids.
  // So, we know that it won't be ENOENT or ENOTDIR or anything else.
  // try really hard to delete stuff on windows, because it has a
  // PROFOUNDLY annoying habit of not closing handles promptly when
  // files are deleted, resulting in spurious ENOTEMPTY errors.
  var retries = isWindows ? 100 : 1
  var i = 0
  do {
    var threw = true
    try {
      var ret = options.rmdirSync(p, options)
      threw = false
      return ret
    } finally {
      if (++i < retries && threw)
        continue
    }
  } while (true)
}
