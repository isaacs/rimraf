const pathArg = require('./path-arg.js')
const optArg = require('./opt-arg.js')

const {rimrafNative, rimrafNativeSync} = require('./rimraf-native.js')
const {rimrafManual, rimrafManualSync} = require('./rimraf-manual.js')
const {rimrafWindows, rimrafWindowsSync} = require('./rimraf-windows.js')
const {rimrafPosix, rimrafPosixSync} = require('./rimraf-posix.js')
const {useNative, useNativeSync} = require('./use-native.js')

const wrap = fn => async (path, opt) => {
  opt = optArg(opt)
  await (Array.isArray(path)
    ? Promise.all(path.map(p => fn(pathArg(p, opt), opt)))
    : fn(pathArg(path, opt), opt))
}

const wrapSync = fn => (path, opt) => {
  opt = optArg(opt)
  return Array.isArray(path)
    ? path.forEach(p => fn(pathArg(p, opt), opt))
    : fn(pathArg(path, opt), opt)
}

const rimraf = wrap((path, opt) =>
  useNative(opt)
    ? rimrafNative(path, opt)
    : rimrafManual(path, opt))

const rimrafSync = wrapSync((path, opt) =>
  useNativeSync(opt)
    ? rimrafNativeSync(path, opt)
    : rimrafManualSync(path, opt))

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
