import t from 'tap'
import { fileURLToPath } from 'url'
import { rimrafManual, rimrafManualSync } from '../dist/esm/rimraf-manual.js'
import { rimrafPosix, rimrafPosixSync } from '../dist/esm/rimraf-posix.js'
import { rimrafWindows, rimrafWindowsSync } from '../dist/esm/rimraf-windows.js'

if (!process.env.__TESTING_RIMRAF_PLATFORM__) {
  const otherPlatform = process.platform !== 'win32' ? 'win32' : 'posix'
  t.spawn(
    process.execPath,
    [...process.execArgv, fileURLToPath(import.meta.url)],
    {
      name: otherPlatform,
      env: {
        ...process.env,
        __TESTING_RIMRAF_PLATFORM__: otherPlatform,
      },
    }
  )
}

const platform = process.env.__TESTING_RIMRAF_PLATFORM__ || process.platform

const [expectManual, expectManualSync] =
  platform === 'win32'
    ? [rimrafWindows, rimrafWindowsSync]
    : [rimrafPosix, rimrafPosixSync]
t.equal(rimrafManual, expectManual, 'got expected implementation')
t.equal(rimrafManualSync, expectManualSync, 'got expected implementation')
