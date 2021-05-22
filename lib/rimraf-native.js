const {
  rmSync,
  promises: {
    rm,
  },
} = require('fs')

const rimrafNative = (path, opts) => rm(path, {
  ...opts,
  force: true,
  recursive: true,
})

const rimrafNativeSync = (path, opts) => rmSync(path, {
  ...opts,
  force: true,
  recursive: true,
})

module.exports = {
  rimrafNative,
  rimrafNativeSync,
}
