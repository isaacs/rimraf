// use this module for tap's recursive directory removal, so that
// the windows tests don't fail with EBUSY.
const rimraf = require('./').default
module.exports = {
  rmdirRecursiveSync: path => rimraf.sync(path),
  rmdirRecursive(path, cb) {
    rimraf(path).then(cb, cb)
  },
}
