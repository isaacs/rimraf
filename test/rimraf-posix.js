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
} = require('../dist/cjs/src/rimraf-posix.js')
const { parse, relative, basename } = require('path')
const { statSync } = require('fs')

const fs = require('../dist/cjs/src/fs.js')

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
    t.doesNotThrow(
      () => rimrafPosixSync(path, {}),
      'deleting a second time is OK'
    )
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
  const { rimrafPosix, rimrafPosixSync } = t.mock(
    '../dist/cjs/src/rimraf-posix.js',
    {
      '../dist/cjs/src/fs.js': {
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
    }
  )
  const path = t.testdir(fixture)
  t.throws(() => rimrafPosixSync(path, {}), { code: 'FOO' })
  t.rejects(rimrafPosix(path, {}), { code: 'FOO' })
})

t.test('throw rmdir errors', async t => {
  const { rimrafPosix, rimrafPosixSync } = t.mock(
    '../dist/cjs/src/rimraf-posix.js',
    {
      '../dist/cjs/src/fs.js': {
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
    }
  )
  const path = t.testdir(fixture)
  t.throws(() => rimrafPosixSync(path, {}), { code: 'FOO' })
  t.rejects(rimrafPosix(path, {}), { code: 'FOO' })
})

t.test('throw unexpected readdir errors', async t => {
  const { rimrafPosix, rimrafPosixSync } = t.mock(
    '../dist/cjs/src/rimraf-posix.js',
    {
      '../dist/cjs/src/fs.js': {
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
    }
  )
  const path = t.testdir(fixture)
  t.throws(() => rimrafPosixSync(path, {}), { code: 'FOO' })
  t.rejects(rimrafPosix(path, {}), { code: 'FOO' })
})

t.test('ignore ENOENTs from unlink/rmdir', async t => {
  const { rimrafPosix, rimrafPosixSync } = t.mock(
    '../dist/cjs/src/rimraf-posix.js',
    {
      '../dist/cjs/src/fs.js': {
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
    }
  )
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
  const { rimrafPosix, rimrafPosixSync } = t.mock(
    '../dist/cjs/src/rimraf-posix.js',
    {
      path: {
        ...require('path'),
        parse: path => {
          const p = parse(path)
          if (path === ROOT) {
            p.root = path
          }
          return p
        },
      },
    }
  )
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

t.test(
  'abort on signal',
  { skip: typeof AbortController === 'undefined' },
  t => {
    const {
      rimrafPosix,
      rimrafPosixSync,
    } = require('../dist/cjs/src/rimraf-posix.js')
    t.test('sync', t => {
      const d = t.testdir(fixture)
      const ac = new AbortController()
      const { signal } = ac
      ac.abort(new Error('aborted rimraf'))
      t.throws(() => rimrafPosixSync(d, { signal }))
      t.end()
    })
    t.test('sync abort in filter', t => {
      const d = t.testdir(fixture)
      const ac = new AbortController()
      const { signal } = ac
      const opt = {
        signal,
        filter: p => {
          if (basename(p) === 'g') {
            ac.abort(new Error('done'))
          }
          return true
        },
      }
      t.throws(() => rimrafPosixSync(d, opt), { message: 'done' })
      t.end()
    })
    t.test('async', async t => {
      const d = t.testdir(fixture)
      const ac = new AbortController()
      const { signal } = ac
      const p = t.rejects(() => rimrafPosix(d, { signal }))
      ac.abort(new Error('aborted rimraf'))
      await p
    })
    t.test('async preaborted', async t => {
      const d = t.testdir(fixture)
      const ac = new AbortController()
      ac.abort(new Error('aborted rimraf'))
      const { signal } = ac
      await t.rejects(() => rimrafPosix(d, { signal }))
    })
    t.end()
  }
)

t.test('filter function', t => {
  t.formatSnapshot = undefined
  const {
    rimrafPosix,
    rimrafPosixSync,
  } = require('../dist/cjs/src/rimraf-posix.js')

  for (const f of ['i', 'j']) {
    t.test(`filter=${f}`, t => {
      t.test('sync', t => {
        const dir = t.testdir(fixture)
        const saw = []
        const filter = p => {
          saw.push(relative(process.cwd(), p).replace(/\\/g, '/'))
          return basename(p) !== f
        }
        rimrafPosixSync(dir, { filter })
        t.matchSnapshot(
          saw.sort((a, b) => a.localeCompare(b, 'en')),
          'paths seen'
        )
        statSync(dir)
        statSync(dir + '/c')
        statSync(dir + '/c/f')
        statSync(dir + '/c/f/i')
        if (f === 'j') {
          statSync(dir + '/c/f/i/j')
        } else {
          t.throws(() => statSync(dir + '/c/f/i/j'))
        }
        t.throws(() => statSync(dir + '/a'))
        t.throws(() => statSync(dir + '/b'))
        t.throws(() => statSync(dir + '/c/d'))
        t.throws(() => statSync(dir + '/c/e'))
        t.throws(() => statSync(dir + '/c/f/g'))
        t.throws(() => statSync(dir + '/c/f/h'))
        t.throws(() => statSync(dir + '/c/f/i/k'))
        t.throws(() => statSync(dir + '/c/f/i/l'))
        t.throws(() => statSync(dir + '/c/f/i/m'))
        t.end()
      })

      t.test('async', async t => {
        const dir = t.testdir(fixture)
        const saw = []
        const filter = p => {
          saw.push(relative(process.cwd(), p).replace(/\\/g, '/'))
          return basename(p) !== f
        }
        await rimrafPosix(dir, { filter })
        t.matchSnapshot(
          saw.sort((a, b) => a.localeCompare(b, 'en')),
          'paths seen'
        )
        statSync(dir)
        statSync(dir + '/c')
        statSync(dir + '/c/f')
        statSync(dir + '/c/f/i')
        if (f === 'j') {
          statSync(dir + '/c/f/i/j')
        } else {
          t.throws(() => statSync(dir + '/c/f/i/j'))
        }
        t.throws(() => statSync(dir + '/a'))
        t.throws(() => statSync(dir + '/b'))
        t.throws(() => statSync(dir + '/c/d'))
        t.throws(() => statSync(dir + '/c/e'))
        t.throws(() => statSync(dir + '/c/f/g'))
        t.throws(() => statSync(dir + '/c/f/h'))
        t.throws(() => statSync(dir + '/c/f/i/k'))
        t.throws(() => statSync(dir + '/c/f/i/l'))
        t.throws(() => statSync(dir + '/c/f/i/m'))
      })

      t.test('async filter', async t => {
        const dir = t.testdir(fixture)
        const saw = []
        const filter = async p => {
          saw.push(relative(process.cwd(), p).replace(/\\/g, '/'))
          await new Promise(setImmediate)
          return basename(p) !== f
        }
        await rimrafPosix(dir, { filter })
        t.matchSnapshot(
          saw.sort((a, b) => a.localeCompare(b, 'en')),
          'paths seen'
        )
        statSync(dir)
        statSync(dir + '/c')
        statSync(dir + '/c/f')
        statSync(dir + '/c/f/i')
        if (f === 'j') {
          statSync(dir + '/c/f/i/j')
        } else {
          t.throws(() => statSync(dir + '/c/f/i/j'))
        }
        t.throws(() => statSync(dir + '/a'))
        t.throws(() => statSync(dir + '/b'))
        t.throws(() => statSync(dir + '/c/d'))
        t.throws(() => statSync(dir + '/c/e'))
        t.throws(() => statSync(dir + '/c/f/g'))
        t.throws(() => statSync(dir + '/c/f/h'))
        t.throws(() => statSync(dir + '/c/f/i/k'))
        t.throws(() => statSync(dir + '/c/f/i/l'))
        t.throws(() => statSync(dir + '/c/f/i/m'))
      })
      t.end()
    })
  }
  t.end()
})

t.test('do not follow symlinks', t => {
  const fixture = {
    x: {
      y: t.fixture('symlink', '../z'),
      z: '',
    },
    z: {
      a: '',
      b: { c: '' },
    },
  }
  t.test('sync', t => {
    const d = t.testdir(fixture)
    t.equal(rimrafPosixSync(d + '/x', {}), true)
    statSync(d + '/z')
    statSync(d + '/z/a')
    statSync(d + '/z/b/c')
    t.end()
  })
  t.test('async', async t => {
    const d = t.testdir(fixture)
    t.equal(await rimrafPosix(d + '/x', {}), true)
    statSync(d + '/z')
    statSync(d + '/z/a')
    statSync(d + '/z/b/c')
  })
  t.end()
})
