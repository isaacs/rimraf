const pathArg = require('./path-arg.js')
const optsArg = require('./opts-arg.js')

const {rimrafNative, rimrafNativeSync} = require('./rimraf-native.js')
const {rimrafManual, rimrafManualSync} = require('./rimraf-manual.js')
const {rimrafWindows, rimrafWindowsSync} = require('./rimraf-windows.js')
const {rimrafPosix, rimrafPosixSync} = require('./rimraf-posix.js')
const {useNative, useNativeSync} = require('./use-native.js')

const wrap = fn => async (path, opts) => {
  opts = optsArg(opts)
  await (Array.isArray(path)
    ? Promise.all(path.map(p => fn(pathArg(p, opts), opts)))
    : fn(pathArg(path, opts), opts))
}

const wrapSync = fn => (path, opts) => {
  opts = optsArg(opts)
  return Array.isArray(path)
    ? path.forEach(p => fn(pathArg(p, opts), opts))
    : fn(pathArg(path, opts), opts)
}

const rimraf = wrap((path, opts) =>
  useNative(opts)
    ? rimrafNative(path, opts)
    : rimrafManual(path, opts))

const rimrafSync = wrapSync((path, opts) =>
  useNativeSync(opts)
    ? rimrafNativeSync(path, opts)
    : rimrafManualSync(path, opts))

rimraf.rimraf = rimraf
rimraf.sync = rimraf.rimrafSync = rimrafSync

const native = wrap(rimrafNative)
const nativeSync = wrapSync(rimrafNativeSync)
native.sync = nativeSync
rimraf.native = native
rimraf.nativeSync = nativeSync

const manual = wrap(rimrafManual)
const manualSync = wrapSync(rimrafManualSync)
manual.sync = manualSync
rimraf.manual = manual
rimraf.manualSync = manualSync

const windows = wrap(rimrafWindows)
const windowsSync = wrapSync(rimrafWindowsSync)
windows.sync = windowsSync
rimraf.windows = windows
rimraf.windowsSync = windowsSync

const posix = wrap(rimrafPosix)
const posixSync = wrapSync(rimrafPosixSync)
posix.sync = posixSync
rimraf.posix = posix
rimraf.posixSync = posixSync

module.exports = rimraf
