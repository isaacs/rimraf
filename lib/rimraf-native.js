const {
  rmSync,
  promises: {
    rm,
  },
} = require('./fs.js')

const rimrafNative = (path, opt) => rm(path, {
  ...opt,
  force: true,
  recursive: true,
})

const rimrafNativeSync = (path, opt) => rmSync(path, {
  ...opt,
  force: true,
  recursive: true,
})

module.exports = {
  rimrafNative,
  rimrafNativeSync,
}
