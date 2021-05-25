// have to do this *before* loading tap, or else the fact that we
// load rimraf-posix.js for tap's fixture cleanup will cause it to
// have some coverage, but not 100%, failing the coverage check.
// if (process.platform === 'win32') {
//   console.log('TAP version 13')
//   console.log('1..0 # this test does not work reliably on windows')
//   process.exit(0)
// }

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

t.test('ignore ENOENTs from unlink/rmdir', async t => {
  const {
    rimrafPosix,
    rimrafPosixSync,
  } = t.mock('../lib/rimraf-posix.js', {
    '../lib/fs.js': {
      ...fs,
      // simulate a case where two rimrafs are happening in parallel,
      // so the deletion happens AFTER the readdir, but before ours.
      rmdirSync: path => {
        fs.rmdirSync(path)
        fs.rmdirSync(path)
      },
      unlinkSync: path => {
        fs.unlinkSync(path)
        fs.unlinkSync(path)
      },
      promises: {
        ...fs.promises,
        rmdir: async path => {
          fs.rmdirSync(path)
          return fs.promises.rmdir(path)
        },
        unlink: async path => {
          fs.unlinkSync(path)
          return fs.promises.unlink(path)
        },
      },
    },
  })
  const { statSync } = fs
  t.test('sync', t => {
    const path = t.testdir(fixture)
    rimrafPosixSync(path, {})
    t.throws(() => statSync(path), { code: 'ENOENT' }, 'deleted')
    t.end()
  })
  t.test('async', async t => {
    const path = t.testdir(fixture)
    await rimrafPosix(path, {})
    t.throws(() => statSync(path), { code: 'ENOENT' }, 'deleted')
  })

  t.end()
})

t.test('rimraffing root, do not actually rmdir root', async t => {
  let ROOT = null
  const { parse } = require('path')
  const { rimrafPosix, rimrafPosixSync } = t.mock('../lib/rimraf-posix.js', {
    path: {
      ...require('path'),
      parse: (path) => {
        const p = parse(path)
        if (path === ROOT)
          p.root = path
        return p
      },
    },
  })
  t.test('async', async t => {
    ROOT = t.testdir(fixture)
    await rimrafPosix(ROOT, { preserveRoot: false })
    t.equal(fs.statSync(ROOT).isDirectory(), true, 'root still present')
    t.same(fs.readdirSync(ROOT), [], 'entries all gone')
  })
  t.test('sync', async t => {
    ROOT = t.testdir(fixture)
    rimrafPosixSync(ROOT, { preserveRoot: false })
    t.equal(fs.statSync(ROOT).isDirectory(), true, 'root still present')
    t.same(fs.readdirSync(ROOT), [], 'entries all gone')
  })
  t.end()
})
