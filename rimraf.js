module.exports = rimraf
rimraf.sync = rimrafSync

var assert = require('assert')
var path = require('path')
var fs = require('fs')
var glob = require('glob')

var globOpts = {
  nosort: true,
  nocomment: true,
  nonegate: true,
  silent: true
}

// for EMFILE handling
var timeout = 0

var isWindows = (process.platform === 'win32')

function defaults (options) {
  var methods = [
    'unlink',
    'chmod',
    'stat',
    'lstat',
    'rmdir',
    'readdir'
  ]
  methods.forEach(function (m) {
    options[m] = options[m] || fs[m]
    m = m + 'Sync'
    options[m] = options[m] || fs[m]
  })

  options.maxBusyTries = options.maxBusyTries || 3
  options.emfileWait = options.emfileWait || 1000
  options.disableGlob = options.disableGlob || false
}

function rimraf (p, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  assert(p, 'rimraf: missing path')
  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
  assert(options, 'rimraf: missing options')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')
  assert.equal(typeof cb, 'function', 'rimraf: callback function required')

  defaults(options)

  var busyTries = 0
  var errState = null
  var n = 0

  if (options.disableGlob || !glob.hasMagic(p)) {
    return afterGlob(null, [p])
  }

  fs.lstat(p, function (err, stat) {
    if (!err) return afterGlob(null, [p])

    glob(p, globOpts, afterGlob)
  })

  function next (err) {
    errState = errState || err
    if (--n === 0) cb(errState)
  }

  function afterGlob (err, results) {
    if (err) return cb(err)

    n = results.length
    if (n === 0) return cb()

    results.forEach(function (p) {
      rimraf_(p, options, function CB (err) {
        if (err) {
          if (isWindows && (err.code === 'EBUSY' || err.code === 'ENOTEMPTY' || err.code === 'EPERM') &&
              busyTries < options.maxBusyTries) {
            busyTries++
            var time = busyTries * 100
            // try again, with the same exact callback as this one.
            return setTimeout(function () {
              rimraf_(p, options, CB)
            }, time)
          }

          // this one won't happen if graceful-fs is used.
          if (err.code === 'EMFILE' && timeout < options.emfileWait) {
            return setTimeout(function () {
              rimraf_(p, options, CB)
            }, timeout++)
          }

          // already gone
          if (err.code === 'ENOENT') err = null
        }

        timeout = 0
        next(err)
      })
    })
  }
}

// Two possible strategies.
// 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
// 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
//
// Both result in an extra syscall when you guess wrong.  However, there
// are likely far more normal files in the world than directories.  This
// is based on the assumption that a the average number of files per
// directory is >= 1.
//
// If anyone ever complains about this, then I guess the strategy could
// be made configurable somehow.  But until then, YAGNI.
function rimraf_ (p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  // sunos lets the root user unlink directories, which is... weird.
  // so we have to lstat here and make sure it's not a dir.
  options.lstat(p, function (err, st) {
    if (err && err.code === 'ENOENT') {
      return cb(null)
    }

    if (st && st.isDirectory()) {
      return rmdir(p, options, err, cb)
    }

    options.unlink(p, function (err) {
      if (err) {
        if (err.code === 'ENOENT') {
          return cb(null)
        }

        if (err.code === 'EPERM') {
          return (isWindows)
            ? fixWinEPERM(p, options, err, cb)
            : rmdir(p, options, err, cb)
        }

        if (err.code === 'EISDIR') {
          return rmdir(p, options, err, cb)
        }
      }
      return cb(err)
    })
  })
}

function fixWinEPERM (p, options, err, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')
  if (err) {
    assert(err instanceof Error)
  }

  options.chmod(p, 666, function (er2) {
    if (er2) {
      cb(er2.code === 'ENOENT' ? null : err)
    } else {
      options.stat(p, function (er3, stats) {
        if (er3) {
          cb(er3.code === 'ENOENT' ? null : err)
        } else if (stats.isDirectory()) {
          rmdir(p, options, err, cb)
        } else {
          options.unlink(p, cb)
        }
      })
    }
  })
}

function fixWinEPERMSync (p, options, err) {
  assert(p)
  assert(options)
  if (err) {
    assert(err instanceof Error)
  }

  try {
    options.chmodSync(p, 666)
  } catch (er2) {
    if (er2.code === 'ENOENT') {
      return
    } else {
      throw err
    }
  }

  try {
    var stats = options.statSync(p)
  } catch (er3) {
    if (er3.code === 'ENOENT') {
      return
    } else {
      throw err
    }
  }

  if (stats.isDirectory()) {
    rmdirSync(p, options, err)
  } else {
    options.unlinkSync(p)
  }
}

function rmdir (p, options, originalEr, cb) {
  assert(p)
  assert(options)
  if (originalEr) {
    assert(originalEr instanceof Error)
  }
  assert(typeof cb === 'function')

  // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
  // if we guessed wrong, and it's not a directory, then
  // raise the original error.
  options.rmdir(p, function (err) {
    if (err && (err.code === 'ENOTEMPTY' || err.code === 'EEXIST' || err.code === 'EPERM')) {
      rmkids(p, options, cb)
    } else if (err && err.code === 'ENOTDIR') {
      cb(originalEr)
    } else {
      cb(err)
    }
  })
}

function rmkids (p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  options.readdir(p, function (err, files) {
    if (err) return cb(err)

    var n = files.length
    if (n === 0) return options.rmdir(p, cb)

    var errState
    files.forEach(function (f) {
      rimraf(path.join(p, f), options, function (err) {
        if (errState) return
        if (err) return cb(errState = err)
        if (--n === 0) options.rmdir(p, cb)
      })
    })
  })
}

// this looks simpler, and is strictly *faster*, but will
// tie up the JavaScript thread and fail on excessively
// deep directory trees.
function rimrafSync (p, options) {
  options = options || {}
  defaults(options)

  assert(p, 'rimraf: missing path')
  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
  assert(options, 'rimraf: missing options')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')

  var results

  if (options.disableGlob || !glob.hasMagic(p)) {
    results = [p]
  } else {
    try {
      fs.lstatSync(p)
      results = [p]
    } catch (err) {
      results = glob.sync(p, globOpts)
    }
  }

  if (!results.length) return

  for (var i = 0; i < results.length; i++) {
    p = results[i]

    try {
      var st = options.lstatSync(p)
    } catch (err) {
      if (err.code === 'ENOENT') return
    }

    try {
      // sunos lets the root user unlink directories, which is... weird.
      if (st && st.isDirectory()) {
        rmdirSync(p, options, null)
      } else {
        options.unlinkSync(p)
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        return
      }
      if (err.code === 'EPERM') {
        return isWindows ? fixWinEPERMSync(p, options, err) : rmdirSync(p, options, err)
      }
      if (err.code !== 'EISDIR') {
        throw err
      }
      rmdirSync(p, options, err)
    }
  }
}

function rmdirSync (p, options, originalEr) {
  assert(p)
  assert(options)
  if (originalEr) {
    assert(originalEr instanceof Error)
  }

  try {
    options.rmdirSync(p)
  } catch (err) {
    if (err.code === 'ENOENT') {
      return
    }
    if (err.code === 'ENOTDIR') {
      throw originalEr
    }
    if (err.code === 'ENOTEMPTY' || err.code === 'EEXIST' || err.code === 'EPERM') {
      rmkidsSync(p, options)
    }
  }
}

function rmkidsSync (p, options) {
  assert(p)
  assert(options)
  options.readdirSync(p).forEach(function (f) {
    rimrafSync(path.join(p, f), options)
  })
  options.rmdirSync(p, options)
}
