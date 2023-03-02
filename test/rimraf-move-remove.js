const t = require('tap')
t.formatSnapshot = calls =>
  calls.map(args =>
    args.map(arg =>
      String(arg)
        .split(process.cwd())
        .join('{CWD}')
        .replace(/\\/g, '/')
        .replace(/.*\/(\.[a-z]\.)[^/]*$/, '{tmpfile}')
    )
  )

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

t.only('actually delete some stuff', async t => {
  const fs = require('../dist/cjs/src/fs.js')
  const fsMock = { ...fs, promises: { ...fs.promises } }

  // simulate annoying windows semantics, where an unlink or rmdir
  // may take an arbitrary amount of time.  we only delay unlinks,
  // to ensure that we will get an error when we try to rmdir.
  const {
    statSync,
    promises: { unlink },
  } = fs

  const danglers = []
  const unlinkLater = path => {
    const p = new Promise(res => {
      setTimeout(() => unlink(path).then(res, res))
    })
    danglers.push(p)
  }
  fsMock.unlinkSync = path => unlinkLater(path)
  fsMock.promises.unlink = async path => unlinkLater(path)

  // but actually do wait to clean them up, though
  t.teardown(() => Promise.all(danglers))

  const { rimrafPosix, rimrafPosixSync } = t.mock(
    '../dist/cjs/src/rimraf-posix.js',
    {
      '../dist/cjs/src/fs.js': fsMock,
    }
  )

  const { rimrafMoveRemove, rimrafMoveRemoveSync } = t.mock(
    '../dist/cjs/src/rimraf-move-remove.js',
    { '../dist/cjs/src/fs.js': fsMock }
  )

  t.test('posix does not work here', t => {
    t.test('sync', t => {
      const path = t.testdir(fixture)
      t.throws(() => rimrafPosixSync(path))
      t.end()
    })
    t.test('async', t => {
      const path = t.testdir(fixture)
      t.rejects(() => rimrafPosix(path))
      t.end()
    })
    t.end()
  })

  t.test('sync', t => {
    const path = t.testdir(fixture)
    rimrafMoveRemoveSync(path, {})
    t.throws(() => statSync(path), { code: 'ENOENT' }, 'deleted')
    t.doesNotThrow(
      () => rimrafMoveRemoveSync(path, {}),
      'deleting a second time is OK'
    )
    t.end()
  })

  t.test('async', async t => {
    const path = t.testdir(fixture)
    await rimrafMoveRemove(path, {})
    t.throws(() => statSync(path), { code: 'ENOENT' }, 'deleted')
    t.resolves(rimrafMoveRemove(path, {}), 'deleting a second time is OK')
  })
  t.end()
})

t.only('throw unlink errors', async t => {
  const fs = require('../dist/cjs/src/fs.js')
  // only throw once here, or else it messes with tap's fixture cleanup
  // that's probably a bug in t.mock?
  let threwAsync = false
  let threwSync = false
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = t.mock(
    '../dist/cjs/src/rimraf-move-remove.js',
    {
      '../dist/cjs/src/fs.js': {
        ...fs,
        unlinkSync: path => {
          if (threwSync) {
            return fs.unlinkSync(path)
          }
          threwSync = true
          throw Object.assign(new Error('cannot unlink'), { code: 'FOO' })
        },
        promises: {
          ...fs.promises,
          unlink: async path => {
            if (threwAsync) {
              return fs.promises.unlink(path)
            }
            threwAsync = true
            throw Object.assign(new Error('cannot unlink'), { code: 'FOO' })
          },
        },
      },
    }
  )
  // nest to clean up the mess
  t.test('sync', t => {
    const path = t.testdir({ test: fixture }) + '/test'
    t.throws(() => rimrafMoveRemoveSync(path, {}), { code: 'FOO' })
    t.end()
  })
  t.test('async', t => {
    const path = t.testdir({ test: fixture }) + '/test'
    t.rejects(rimrafMoveRemove(path, {}), { code: 'FOO' })
    t.end()
  })
  t.end()
})

t.only('ignore ENOENT unlink errors', async t => {
  const fs = require('../dist/cjs/src/fs.js')
  const threwAsync = false
  let threwSync = false
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = t.mock(
    '../dist/cjs/src/rimraf-move-remove.js',
    {
      '../dist/cjs/src/fs.js': {
        ...fs,
        unlinkSync: path => {
          fs.unlinkSync(path)
          if (threwSync) {
            return
          }
          threwSync = true
          fs.unlinkSync(path)
        },
        promises: {
          ...fs.promises,
          unlink: async path => {
            fs.unlinkSync(path)
            if (threwAsync) {
              return
            }
            threwSync = true
            fs.unlinkSync(path)
          },
        },
      },
    }
  )
  // nest to clean up the mess
  t.test('sync', t => {
    const path = t.testdir({ test: fixture }) + '/test'
    t.doesNotThrow(() => rimrafMoveRemoveSync(path, {}), 'enoent no problems')
    t.end()
  })
  t.test('async', t => {
    const path = t.testdir({ test: fixture }) + '/test'
    t.resolves(() => rimrafMoveRemove(path, {}), 'enoent no problems')
    t.end()
  })
  t.end()
})

t.test('throw rmdir errors', async t => {
  const fs = require('../dist/cjs/src/fs.js')
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = t.mock(
    '../dist/cjs/src/rimraf-move-remove.js',
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
  t.test('sync', t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    t.throws(() => rimrafMoveRemoveSync(path, {}), { code: 'FOO' })
    t.end()
  })
  t.test('async', t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    t.rejects(rimrafMoveRemove(path, {}), { code: 'FOO' })
    t.end()
  })
  t.end()
})

t.test('throw unexpected readdir errors', async t => {
  const fs = require('../dist/cjs/src/fs.js')
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = t.mock(
    '../dist/cjs/src/rimraf-move-remove.js',
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
  t.test('sync', t => {
    // nest to clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    t.throws(() => rimrafMoveRemoveSync(path, {}), { code: 'FOO' })
    t.end()
  })
  t.test('async', t => {
    // nest to clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    t.rejects(rimrafMoveRemove(path, {}), { code: 'FOO' })
    t.end()
  })
  t.end()
})

t.test('refuse to delete the root dir', async t => {
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = t.mock(
    '../dist/cjs/src/rimraf-move-remove.js',
    {
      path: {
        ...require('path'),
        dirname: path => path,
      },
    }
  )

  // not brave enough to pass the actual c:\\ here...
  t.throws(() => rimrafMoveRemoveSync('some-path', { tmp: 'some-path' }), {
    message: 'cannot delete temp directory used for deletion',
  })
  t.rejects(() => rimrafMoveRemove('some-path', { tmp: 'some-path' }), {
    message: 'cannot delete temp directory used for deletion',
  })
})

t.test('handle EPERMs on unlink by trying to chmod 0o666', async t => {
  const fs = require('../dist/cjs/src/fs.js')
  const CHMODS = []
  let threwAsync = false
  let threwSync = false
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = t.mock(
    '../dist/cjs/src/rimraf-move-remove.js',
    {
      '../dist/cjs/src/fs.js': {
        ...fs,
        chmodSync: (...args) => {
          CHMODS.push(['chmodSync', ...args])
          return fs.chmodSync(...args)
        },
        unlinkSync: path => {
          if (threwSync) {
            return fs.unlinkSync(path)
          }
          threwSync = true
          throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
        },
        promises: {
          ...fs.promises,
          unlink: async path => {
            if (threwAsync) {
              return fs.promises.unlink(path)
            }
            threwAsync = true
            throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
          },
          chmod: async (...args) => {
            CHMODS.push(['chmod', ...args])
            return fs.promises.chmod(...args)
          },
        },
      },
    }
  )

  t.afterEach(() => (CHMODS.length = 0))

  t.test('sync', t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    rimrafMoveRemoveSync(path, {})
    t.matchSnapshot(CHMODS)
    t.end()
  })
  t.test('async', async t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    await rimrafMoveRemove(path, {})
    t.matchSnapshot(CHMODS)
    t.end()
  })
  t.end()
})

t.test('handle EPERMs, chmod returns ENOENT', async t => {
  const fs = require('../dist/cjs/src/fs.js')
  const CHMODS = []
  let threwAsync = false
  let threwSync = false
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = t.mock(
    '../dist/cjs/src/rimraf-move-remove.js',
    {
      '../dist/cjs/src/fs.js': {
        ...fs,
        chmodSync: (...args) => {
          CHMODS.push(['chmodSync', ...args])
          try {
            fs.unlinkSync(args[0])
          } catch (_) {}
          return fs.chmodSync(...args)
        },
        unlinkSync: path => {
          if (threwSync) {
            return fs.unlinkSync(path)
          }
          threwSync = true
          throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
        },
        promises: {
          ...fs.promises,
          unlink: async path => {
            if (threwAsync) {
              return fs.promises.unlink(path)
            }
            threwAsync = true
            throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
          },
          chmod: async (...args) => {
            CHMODS.push(['chmod', ...args])
            try {
              fs.unlinkSync(args[0])
            } catch (_) {}
            return fs.promises.chmod(...args)
          },
        },
      },
    }
  )

  t.afterEach(() => (CHMODS.length = 0))

  t.test('sync', t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    rimrafMoveRemoveSync(path, {})
    t.matchSnapshot(CHMODS)
    t.end()
  })
  t.test('async', async t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    await rimrafMoveRemove(path, {})
    t.matchSnapshot(CHMODS)
    t.end()
  })
  t.end()
})

t.test('handle EPERMs, chmod raises something other than ENOENT', async t => {
  const fs = require('../dist/cjs/src/fs.js')
  const CHMODS = []
  let threwAsync = false
  let threwSync = false
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = t.mock(
    '../dist/cjs/src/rimraf-move-remove.js',
    {
      '../dist/cjs/src/fs.js': {
        ...fs,
        chmodSync: (...args) => {
          CHMODS.push(['chmodSync', ...args])
          try {
            fs.unlinkSync(args[0])
          } catch (_) {}
          throw new Error('cannot chmod', { code: 'FOO' })
        },
        unlinkSync: path => {
          if (threwSync) {
            return fs.unlinkSync(path)
          }
          threwSync = true
          throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
        },
        promises: {
          ...fs.promises,
          unlink: async path => {
            if (threwAsync) {
              return fs.promises.unlink(path)
            }
            threwAsync = true
            throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
          },
          chmod: async (...args) => {
            CHMODS.push(['chmod', ...args])
            try {
              fs.unlinkSync(args[0])
            } catch (_) {}
            throw new Error('cannot chmod', { code: 'FOO' })
          },
        },
      },
    }
  )

  t.afterEach(() => (CHMODS.length = 0))

  t.test('sync', t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    t.throws(() => rimrafMoveRemoveSync(path, {}), { code: 'EPERM' })
    t.matchSnapshot(CHMODS)
    t.end()
  })
  t.test('async', async t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    t.rejects(rimrafMoveRemove(path, {}), { code: 'EPERM' })
    t.matchSnapshot(CHMODS)
    t.end()
  })
  t.end()
})

t.test('rimraffing root, do not actually rmdir root', async t => {
  const fs = require('../dist/cjs/src/fs.js')
  let ROOT = null
  const { parse } = require('path')
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = t.mock(
    '../dist/cjs/src/rimraf-move-remove.js',
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
    await rimrafMoveRemove(ROOT, { preserveRoot: false })
    t.equal(fs.statSync(ROOT).isDirectory(), true, 'root still present')
    t.same(fs.readdirSync(ROOT), [], 'entries all gone')
  })
  t.test('sync', async t => {
    ROOT = t.testdir(fixture)
    rimrafMoveRemoveSync(ROOT, { preserveRoot: false })
    t.equal(fs.statSync(ROOT).isDirectory(), true, 'root still present')
    t.same(fs.readdirSync(ROOT), [], 'entries all gone')
  })
  t.end()
})

t.test(
  'abort if the signal says to',
  { skip: typeof AbortController === 'undefined' },
  t => {
    const { rimrafMoveRemove, rimrafMoveRemoveSync } = t.mock(
      '../dist/cjs/src/rimraf-move-remove.js',
      {}
    )
    t.test('sync', t => {
      const ac = new AbortController()
      const { signal } = ac
      ac.abort(new Error('aborted rimraf'))
      const d = t.testdir(fixture)
      t.throws(() => rimrafMoveRemoveSync(d, { signal }))
      t.end()
    })
    t.test('async', async t => {
      const ac = new AbortController()
      const { signal } = ac
      const d = t.testdir(fixture)
      const p = t.rejects(() => rimrafMoveRemove(d, { signal }))
      ac.abort(new Error('aborted rimraf'))
      await p
    })
    t.test('async, pre-aborted', async t => {
      const ac = new AbortController()
      const { signal } = ac
      const d = t.testdir(fixture)
      ac.abort(new Error('aborted rimraf'))
      await t.rejects(() => rimrafMoveRemove(d, { signal }))
    })

    t.end()
  }
)
