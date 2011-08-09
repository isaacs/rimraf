// rimraf deferred/promise port written by Mariusz Nowak
// It will work only with es5-ext@0.6 and deferred@0.2 packages installed

module.exports = rimraf;

var path = require('path')
  , fs = require('fs')

  , fnl = require('es5-ext/lib/Function')
  , curry = fnl.curry.call, rcurry = fnl.rcurry.call, lock = fnl.lock.call
  , i = fnl.i, k = fnl.k

  , deferred = require('deferred'), delay = deferred.delay, all = deferred.all
  , promise = deferred.promise, ba2p = deferred.asyncToPromise.bind

  , lstat = ba2p(fs.lstat), readLink = ba2p(fs.readLink)
  , unlink = ba2p(fs.unlink), readdir = ba2p(fs.readdir), rmdir = ba2p(fs.rmdir)

// for EMFILE backoff.
var timeout = 0
  , EMFILE_MAX = 1000

function rimraf (p, opts) {
  var busyTries = 0
  opts = opts || {}
  opts.maxBusyTries = opts.maxBusyTries || 3

  return rimraf_(p, opts)
}

function rimraf_ (p, opts) {
  return lstat(p)
  (opts.gently ? function (s) {
    return (!s.isSymbolicLink()) ? promise(path.resolve(p)) :
      readLink(p)(curry(path.resolve, path.dirname(p)))
    (function (rp) {
      if (rp.indexOf(opts.gently) !== 0) clobberFail()
      return s
    }, k(s))
  } : i)
  (function (s) {
    if (!s.isDirectory()) return unlink(p)
    return readdir(p)
    (rcurry(all, function (f) {
      return rimraf(path.join(p, f), opts);
    }))
    (lock(rmdir, p))
  })
  (function (r) {
    timeout = 0; return r;
  }, function CB (er) {
    if (er.message.match(/^EBUSY/) && busyTries < opts.maxBusyTries) {
      var time = (opts.maxBusyTries - busyTries) * 100
      busyTries ++
      // try again, with the same exact callback as this one.
      return rimraf_(p, opts);
    }

    // this one won't happen if graceful-fs is used.
    if (er.message.match(/^EMFILE/) && timeout < EMFILE_MAX) {
      return delay(curry(rimraf_, p, opts), timeout ++);
    }

    // already gone
    if (er.message.match(/^ENOENT/)) er = null

    timeout = 0
    return er
  })

  function clobberFail () {
    var er = new Error("Refusing to delete: "+p+" not in "+opts.gently)
      , constants = require("constants")
    er.errno = constants.EEXIST
    er.code = "EEXIST"
    er.path = p
    throw er
  }
}
