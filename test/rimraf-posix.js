// have to do this *before* loading tap, or else the fact that we
// load rimraf-posix.js for tap's fixture cleanup will cause it to
// have some coverage, but not 100%, failing the coverage check.
if (process.platform === 'win32') {
  console.log('TAP version 13')
  console.log('1..0 # this test does not work reliably on windows')
  process.exit(0)
}

const t = require('tap')
const {
  rimrafPosix,
  rimrafPosixSync,
} = require('../lib/rimraf-posix.js')

const fs = require('../lib/fs.js')

const fixture = {
  a: 'a',
  b: 'b',
  c: {
    d: 'd',
    e: 'e',
    f: {
      g: 'g',
      h: 'h',
      i: {
        j: 'j',
        k: 'k',
        l: 'l',
        m: {
          n: 'n',
          o: 'o',
        },
      },
    },
  },
}

t.test('actually delete some stuff', t => {
  const { statSync } = fs
  t.test('sync', t => {
    const path = t.testdir(fixture)
    rimrafPosixSync(path, {})
    t.throws(() => statSync(path), { code: 'ENOENT' }, 'deleted')
    t.doesNotThrow(() => rimrafPosixSync(path, {}),
      'deleting a second time is OK')
    t.end()
  })
  t.test('async', async t => {
    const path = t.testdir(fixture)
    await rimrafPosix(path, {})
    t.throws(() => statSync(path), { code: 'ENOENT' }, 'deleted')
    t.resolves(rimrafPosix(path, {}), 'deleting a second time is OK')
  })
  t.end()
})

t.test('throw unlink errors', async t => {
  const {
    rimrafPosix,
    rimrafPosixSync,
  } = t.mock('../lib/rimraf-posix.js', {
    '../lib/fs.js': {
      ...fs,
      unlinkSync: path => {
        throw Object.assign(new Error('cannot unlink'), { code: 'FOO' })
      },
      promises: {
        ...fs.promises,
        unlink: async path => {
          throw Object.assign(new Error('cannot unlink'), { code: 'FOO' })
        },
      },
    },
  })
  const path = t.testdir(fixture)
  t.throws(() => rimrafPosixSync(path, {}), { code: 'FOO' })
  t.rejects(rimrafPosix(path, {}), { code: 'FOO' })
})

t.test('throw rmdir errors', async t => {
  const {
    rimrafPosix,
    rimrafPosixSync,
  } = t.mock('../lib/rimraf-posix.js', {
    '../lib/fs.js': {
      ...fs,
      rmdirSync: path => {
        throw Object.assign(new Error('cannot rmdir'), { code: 'FOO' })
      },
      promises: {
        ...fs.promises,
        rmdir: async path => {
          throw Object.assign(new Error('cannot rmdir'), { code: 'FOO' })
        },
      },
    },
  })
  const path = t.testdir(fixture)
  t.throws(() => rimrafPosixSync(path, {}), { code: 'FOO' })
  t.rejects(rimrafPosix(path, {}), { code: 'FOO' })
})

t.test('throw unexpected readdir errors', async t => {
  const {
    rimrafPosix,
    rimrafPosixSync,
  } = t.mock('../lib/rimraf-posix.js', {
    '../lib/fs.js': {
      ...fs,
      readdirSync: path => {
        throw Object.assign(new Error('cannot readdir'), { code: 'FOO' })
      },
      promises: {
        ...fs.promises,
        readdir: async path => {
          throw Object.assign(new Error('cannot readdir'), { code: 'FOO' })
        },
      },
    },
  })
  const path = t.testdir(fixture)
  t.throws(() => rimrafPosixSync(path, {}), { code: 'FOO' })
  t.rejects(rimrafPosix(path, {}), { code: 'FOO' })
})
