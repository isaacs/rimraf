import t from 'tap'

import { tmpdir } from 'os'
import { win32 } from 'path'

t.test('posix platform', async t => {
  const { defaultTmp, defaultTmpSync } = (await t.mockImport(
    '../dist/esm/default-tmp.js',
    {
      '../dist/esm/platform.js': 'posix',
    },
  )) as typeof import('../dist/esm/default-tmp.js')
  t.equal(defaultTmpSync('anything'), tmpdir())
  t.equal(await defaultTmp('anything').then(t => t), tmpdir())
})

t.test('windows', async t => {
  const tempDirCheck = (path: string) => {
    switch (path.toLowerCase()) {
      case 'd:\\temp':
        return { isDirectory: () => true }
      case 'e:\\temp':
        return { isDirectory: () => false }
      default:
        throw Object.assign(new Error('no ents here'), { code: 'ENOENT' })
    }
  }
  const { defaultTmp, defaultTmpSync } = (await t.mockImport(
    '../dist/esm/default-tmp.js',
    {
      os: {
        tmpdir: () => 'C:\\Windows\\Temp',
      },
      path: win32,
      '../dist/esm/platform.js': 'win32',
      '../dist/esm/fs.js': {
        statSync: tempDirCheck,
        promises: {
          stat: async (path: string) => tempDirCheck(path),
        },
      },
    },
  )) as typeof import('../dist/esm/default-tmp.js')

  const expect = {
    'c:\\some\\path': 'C:\\Windows\\Temp',
    'C:\\some\\path': 'C:\\Windows\\Temp',
    'd:\\some\\path': 'd:\\temp',
    'D:\\some\\path': 'D:\\temp',
    'e:\\some\\path': 'e:\\',
    'E:\\some\\path': 'E:\\',
    'f:\\some\\path': 'f:\\',
    'F:\\some\\path': 'F:\\',
  }

  for (const [path, tmp] of Object.entries(expect)) {
    t.test(`${path} -> ${tmp}`, async t => {
      t.equal(defaultTmpSync(path), tmp, 'sync')
      t.equal(await defaultTmp(path), tmp, 'async')
    })
  }

  t.end()
})
