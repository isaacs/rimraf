const platform = require('./platform.js')

const { rimrafWindows, rimrafWindowsSync } = require('./rimraf-windows.js')
const { rimrafPosix, rimrafPosixSync } = require('./rimraf-posix.js')

const [rimrafManual, rimrafManualSync] = platform === 'win32' ? [
  rimrafWindows,
  rimrafWindowsSync,
] : [
  rimrafPosix,
  rimrafPosixSync,
]

module.exports = {
  rimrafManual,
  rimrafManualSync,
}
