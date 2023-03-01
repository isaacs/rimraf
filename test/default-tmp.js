const t = require('tap')

t.test('posix platform', async t => {
  const { tmpdir } = require('os')
  const { defaultTmp, defaultTmpSync } = t.mock(
    '../dist/cjs/src/default-tmp.js',
    {
      '../dist/cjs/src/platform.js': 'posix',
    }
  )
  t.equal(defaultTmpSync('anything'), tmpdir())
  t.equal(await defaultTmp('anything').then(t => t), tmpdir())
})

t.test('windows', async t => {
  const tempDirCheck = path => {
    switch (path.toLowerCase()) {
      case 'd:\\temp':
        return { isDirectory: () => true }
      case 'e:\\temp':
        return { isDirectory: () => false }
      default:
        throw Object.assign(new Error('no ents here'), { code: 'ENOENT' })
    }
  }
  const { defaultTmp, defaultTmpSync } = t.mock(
    '../dist/cjs/src/default-tmp.js',
    {
      os: {
        tmpdir: () => 'C:\\Windows\\Temp',
      },
      path: require('path').win32,
      '../dist/cjs/src/platform.js': 'win32',
      '../dist/cjs/src/fs.js': {
        statSync: tempDirCheck,
        promises: {
          stat: async path => tempDirCheck(path),
        },
      },
    }
  )

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
