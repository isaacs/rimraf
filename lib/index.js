const pathArg = require('./path-arg.js')
const optsArg = require('./opts-arg.js')

const {rimrafNative, rimrafNativeSync} = require('./rimraf-native.js')
const {rimrafManual, rimrafManualSync} = require('./rimraf-manual.js')
const {rimrafWindows, rimrafWindowsSync} = require('./rimraf-windows.js')
const {rimrafPosix, rimrafPosixSync} = require('./rimraf-posix.js')
const {useNative, useNativeSync} = require('./use-native.js')

const rimraf = (path, opts) => {
  path = pathArg(path)
  opts = optsArg(opts)
  return useNative(opts) ? rimrafNative(path, opts)
    : rimrafManual(path, opts)
}

const rimrafSync = async (path, opts) => {
  path = pathArg(path)
  opts = optsArg(opts)
  return useNativeSync(opts) ? rimrafNativeSync(path, opts)
    : rimrafManualSync(path, opts)
}

rimraf.rimraf = rimraf
rimraf.sync = rimraf.rimrafSync = rimrafSync

const native = async (path, opts) =>
  rimrafNative(pathArg(path), optsArg(opts))
const nativeSync = (path, opts) =>
  rimrafNativeSync(pathArg(path), optsArg(opts))
native.sync = nativeSync
rimraf.native = native
rimraf.nativeSync = nativeSync

const manual = async (path, opts) =>
  rimrafManual(pathArg(path), optsArg(opts))
const manualSync = (path, opts) =>
  rimrafManualSync(pathArg(path), optsArg(opts))
manual.sync = manualSync
rimraf.manual = manual
rimraf.manualSync = manualSync

const windows = async (path, opts) =>
  rimrafWindows(pathArg(path), optsArg(opts))
const windowsSync = (path, opts) =>
  rimrafWindowsSync(pathArg(path), optsArg(opts))
windows.sync = windowsSync
rimraf.windows = windows
rimraf.windowsSync = windowsSync

const posix = async (path, opts) =>
  rimrafPosix(pathArg(path), optsArg(opts))
const posixSync = (path, opts) =>
  rimrafPosixSync(pathArg(path), optsArg(opts))
posix.sync = posixSync
rimraf.posix = posix
rimraf.posixSync = posixSync

module.exports = rimraf
