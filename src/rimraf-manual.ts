import platform from './platform'

import { rimrafPosix, rimrafPosixSync } from './rimraf-posix'
import { rimrafWindows, rimrafWindowsSync } from './rimraf-windows'

export const rimrafManual = platform === 'win32' ? rimrafWindows : rimrafPosix
export const rimrafManualSync =
  platform === 'win32' ? rimrafWindowsSync : rimrafPosixSync
