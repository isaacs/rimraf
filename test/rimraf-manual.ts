import t from 'tap'
import { rimrafPosix, rimrafPosixSync } from '../src/rimraf-posix.js'
import { rimrafWindows, rimrafWindowsSync } from '../src/rimraf-windows.js'

for (const platform of ['win32', 'posix']) {
  t.test(platform, async t => {
    t.intercept(process, 'platform', { value: platform })

    const { rimrafManual, rimrafManualSync } = (await t.mockImport(
      '../src/rimraf-manual.js',
    )) as typeof import('../src/rimraf-manual.js')

    const [expectManual, expectManualSync] =
      platform === 'win32' ?
        [rimrafWindows, rimrafWindowsSync]
      : [rimrafPosix, rimrafPosixSync]

    t.equal(rimrafManual, expectManual, 'got expected implementation')
    t.equal(rimrafManualSync, expectManualSync, 'got expected implementation')
  })
}
