import { rimrafPosix, rimrafPosixSync } from './rimraf-posix.js'
import { rimrafWindows, rimrafWindowsSync } from './rimraf-windows.js'

export const rimrafManual =
  process.platform === 'win32' ? rimrafWindows : rimrafPosix
export const rimrafManualSync =
  process.platform === 'win32' ? rimrafWindowsSync : rimrafPosixSync
