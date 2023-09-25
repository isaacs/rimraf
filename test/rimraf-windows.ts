import { Dirent, PathLike, Stats, statSync } from 'fs'
import * as PATH from 'path'
import { basename, parse, relative } from 'path'
import t from 'tap'
import * as FS from '../dist/esm/fs.js'
import { rimrafWindows, rimrafWindowsSync } from '../dist/esm/rimraf-windows.js'

t.formatSnapshot = (calls: string[][]) =>
  Array.isArray(calls)
    ? calls.map(args =>
        args.map(arg =>
          String(arg)
            .split(process.cwd())
            .join('{CWD}')
            .replace(/\\/g, '/')
            .replace(/.*\/(\.[a-z]\.)[^/]*$/, '{tmpfile}')
        )
      )
    : calls

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

t.test('actually delete some stuff', async t => {
  const fsMock: Record<string, any> = { ...FS, promises: { ...FS.promises } }

  // simulate annoying windows semantics, where an unlink or rmdir
  // may take an arbitrary amount of time.  we only delay unlinks,
  // to ensure that we will get an error when we try to rmdir.
  const {
    statSync,
    promises: { unlink },
  } = FS

  const danglers: Promise<void>[] = []
  const unlinkLater = (path: string) => {
    const p = new Promise<void>(res => {
      setTimeout(() => unlink(path).then(res, res), 100)
    })
    danglers.push(p)
  }
  fsMock.unlinkSync = (path: string) => unlinkLater(path)
  fsMock.promises.unlink = async (path: string) => unlinkLater(path)

  // but actually do wait to clean them up, though
  t.teardown(async () => {
    await Promise.all(danglers)
  })

  const { rimrafPosix, rimrafPosixSync } = (await t.mockImport(
    '../dist/esm/rimraf-posix.js',
    {
      '../dist/esm/fs.js': fsMock,
    }
  )) as typeof import('../dist/esm/rimraf-posix.js')

  const { rimrafWindows, rimrafWindowsSync } = (await t.mockImport(
    '../dist/esm/rimraf-windows.js',
    { '../dist/esm/fs.js': fsMock }
  )) as typeof import('../dist/esm/rimraf-windows.js')

  t.test('posix does not work here', t => {
    t.test('sync', t => {
      const path = t.testdir(fixture)
      t.throws(() => rimrafPosixSync(path, {}))
      t.end()
    })
    t.test('async', async t => {
      const path = t.testdir(fixture)
      await t.rejects(() => rimrafPosix(path, {}))
      t.end()
    })
    t.end()
  })

  t.test('sync', t => {
    const path = t.testdir(fixture)
    rimrafWindowsSync(path, {})
    t.throws(() => statSync(path), { code: 'ENOENT' }, 'deleted')
    t.doesNotThrow(
      () => rimrafWindowsSync(path, {}),
      'deleting a second time is OK'
    )
    t.end()
  })

  t.test('async', async t => {
    const path = t.testdir(fixture)
    await rimrafWindows(path, {})
    t.throws(() => statSync(path), { code: 'ENOENT' }, 'deleted')
    await t.resolves(rimrafWindows(path, {}), 'deleting a second time is OK')
  })
  t.end()
})

t.test('throw unlink errors', async t => {
  // only throw once here, or else it messes with tap's fixture cleanup
  // that's probably a bug in t.mock?
  let threwAsync = false
  let threwSync = false
  const { rimrafWindows, rimrafWindowsSync } = (await t.mockImport(
    '../dist/esm/rimraf-windows.js',
    {
      '../dist/esm/fs.js': {
        ...FS,
        unlinkSync: (path: string) => {
          if (threwSync) {
            return FS.unlinkSync(path)
          }
          threwSync = true
          throw Object.assign(new Error('cannot unlink'), { code: 'FOO' })
        },
        promises: {
          ...FS.promises,
          unlink: async (path: string) => {
            if (threwAsync) {
              return FS.promises.unlink(path)
            }
            threwAsync = true
            throw Object.assign(new Error('cannot unlink'), { code: 'FOO' })
          },
        },
      },
    }
  )) as typeof import('../dist/esm/rimraf-windows.js')
  // nest to clean up the mess
  t.test('sync', t => {
    const path = t.testdir({ test: fixture }) + '/test'
    t.throws(() => rimrafWindowsSync(path, {}), { code: 'FOO' })
    t.end()
  })
  t.test('async', t => {
    const path = t.testdir({ test: fixture }) + '/test'
    t.rejects(rimrafWindows(path, {}), { code: 'FOO' })
    t.end()
  })
  t.end()
})

t.test('ignore ENOENT unlink errors', async t => {
  const threwAsync = false
  let threwSync = false
  const { rimrafWindows, rimrafWindowsSync } = (await t.mockImport(
    '../dist/esm/rimraf-windows.js',
    {
      '../dist/esm/fs.js': {
        ...FS,
        unlinkSync: (path: string) => {
          FS.unlinkSync(path)
          if (threwSync) {
            return
          }
          threwSync = true
          FS.unlinkSync(path)
        },
        promises: {
          ...FS.promises,
          unlink: async (path: string) => {
            FS.unlinkSync(path)
            if (threwAsync) {
              return
            }
            threwSync = true
            FS.unlinkSync(path)
          },
        },
      },
    }
  )) as typeof import('../dist/esm/rimraf-windows.js')
  // nest to clean up the mess
  t.test('sync', t => {
    const path = t.testdir({ test: fixture }) + '/test'
    t.doesNotThrow(() => rimrafWindowsSync(path, {}), 'enoent no problems')
    t.end()
  })
  t.test('async', t => {
    const path = t.testdir({ test: fixture }) + '/test'
    t.resolves(() => rimrafWindows(path, {}), 'enoent no problems')
    t.end()
  })
  t.end()
})

t.test('throw rmdir errors', async t => {
  const { rimrafWindows, rimrafWindowsSync } = (await t.mockImport(
    '../dist/esm/rimraf-windows.js',
    {
      '../dist/esm/fs.js': {
        ...FS,
        rmdirSync: () => {
          throw Object.assign(new Error('cannot rmdir'), { code: 'FOO' })
        },
        promises: {
          ...FS.promises,
          rmdir: async () => {
            throw Object.assign(new Error('cannot rmdir'), { code: 'FOO' })
          },
        },
      },
    }
  )) as typeof import('../dist/esm/rimraf-windows.js')
  t.test('sync', t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    t.throws(() => rimrafWindowsSync(path, {}), { code: 'FOO' })
    t.end()
  })
  t.test('async', t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    t.rejects(rimrafWindows(path, {}), { code: 'FOO' })
    t.end()
  })
  t.end()
})

t.test('throw unexpected readdir errors', async t => {
  const { rimrafWindows, rimrafWindowsSync } = (await t.mockImport(
    '../dist/esm/rimraf-windows.js',
    {
      '../dist/esm/fs.js': {
        ...FS,
        readdirSync: () => {
          throw Object.assign(new Error('cannot readdir'), { code: 'FOO' })
        },
        promises: {
          ...FS.promises,
          readdir: async () => {
            throw Object.assign(new Error('cannot readdir'), { code: 'FOO' })
          },
        },
      },
    }
  )) as typeof import('../dist/esm/rimraf-windows.js')
  t.test('sync', t => {
    // nest to clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    t.throws(() => rimrafWindowsSync(path, {}), { code: 'FOO' })
    t.end()
  })
  t.test('async', t => {
    // nest to clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    t.rejects(rimrafWindows(path, {}), { code: 'FOO' })
    t.end()
  })
  t.end()
})

t.test('handle EPERMs on unlink by trying to chmod 0o666', async t => {
  const CHMODS = []
  let threwAsync = false
  let threwSync = false
  const { rimrafWindows, rimrafWindowsSync } = (await t.mockImport(
    '../dist/esm/rimraf-windows.js',
    {
      '../dist/esm/fs.js': {
        ...FS,
        chmodSync: (...args: any[]) => {
          CHMODS.push(['chmodSync', ...args])
          //@ts-ignore
          return FS.chmodSync(...args)
        },
        unlinkSync: (path: string) => {
          if (threwSync) {
            return FS.unlinkSync(path)
          }
          threwSync = true
          throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
        },
        promises: {
          ...FS.promises,
          unlink: async (path: String) => {
            if (threwAsync) {
              return FS.promises.unlink(path as PathLike)
            }
            threwAsync = true
            throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
          },
          chmod: async (...args: any[]) => {
            CHMODS.push(['chmod', ...args])
            //@ts-ignore
            return FS.promises.chmod(...args)
          },
        },
      },
    }
  )) as typeof import('../dist/esm/rimraf-windows.js')

  t.afterEach(() => (CHMODS.length = 0))

  t.test('sync', t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    rimrafWindowsSync(path, {})
    t.matchSnapshot(CHMODS.length, 'chmods')
    t.end()
  })
  t.test('async', async t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    await rimrafWindows(path, {})
    t.matchSnapshot(CHMODS.length, 'chmods')
    t.end()
  })
  t.end()
})

t.test('handle EPERMs, chmod returns ENOENT', async t => {
  const CHMODS = []
  let threwAsync = false
  let threwSync = false
  const { rimrafWindows, rimrafWindowsSync } = (await t.mockImport(
    '../dist/esm/rimraf-windows.js',
    {
      '../dist/esm/fs.js': {
        ...FS,
        chmodSync: (...args: any[]) => {
          CHMODS.push(['chmodSync', ...args])
          try {
            FS.unlinkSync(args[0])
          } catch (_) {}
          //@ts-ignore
          return FS.chmodSync(...args)
        },
        unlinkSync: (path: string) => {
          if (threwSync) {
            return FS.unlinkSync(path)
          }
          threwSync = true
          throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
        },
        promises: {
          ...FS.promises,
          unlink: async (path: string) => {
            if (threwAsync) {
              return FS.promises.unlink(path)
            }
            threwAsync = true
            throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
          },
          chmod: async (...args: any[]) => {
            CHMODS.push(['chmod', ...args])
            try {
              FS.unlinkSync(args[0])
            } catch (_) {}
            //@ts-ignore
            return FS.promises.chmod(...args)
          },
        },
      },
    }
  )) as typeof import('../dist/esm/rimraf-windows.js')

  t.afterEach(() => (CHMODS.length = 0))

  t.test('sync', t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    rimrafWindowsSync(path, {})
    t.matchSnapshot(CHMODS.length, 'chmods')
    t.end()
  })
  t.test('async', async t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    await rimrafWindows(path, {})
    t.matchSnapshot(CHMODS.length, 'chmods')
    t.end()
  })
  t.end()
})

t.test('handle EPERMs, chmod raises something other than ENOENT', async t => {
  const CHMODS = []
  let threwAsync = false
  let threwSync = false
  const { rimrafWindows, rimrafWindowsSync } = (await t.mockImport(
    '../dist/esm/rimraf-windows.js',
    {
      '../dist/esm/fs.js': {
        ...FS,
        chmodSync: (...args: any[]) => {
          CHMODS.push(['chmodSync', ...args])
          try {
            FS.unlinkSync(args[0])
          } catch (_) {}
          throw Object.assign(new Error('cannot chmod'), { code: 'FOO' })
        },
        unlinkSync: (path: string) => {
          if (threwSync) {
            return FS.unlinkSync(path)
          }
          threwSync = true
          throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
        },
        promises: {
          ...FS.promises,
          unlink: async (path: string) => {
            if (threwAsync) {
              return FS.promises.unlink(path)
            }
            threwAsync = true
            throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
          },
          chmod: async (...args: any[]) => {
            CHMODS.push(['chmod', ...args])
            try {
              FS.unlinkSync(args[0])
            } catch (_) {}
            throw Object.assign(new Error('cannot chmod'), { code: 'FOO' })
          },
        },
      },
    }
  )) as typeof import('../dist/esm/rimraf-windows.js')

  t.afterEach(() => (CHMODS.length = 0))

  t.test('sync', t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    t.throws(() => rimrafWindowsSync(path, {}), { code: 'EPERM' })
    t.matchSnapshot(CHMODS.length, 'chmods')
    t.end()
  })
  t.test('async', async t => {
    // nest it so that we clean up the mess
    const path = t.testdir({ test: fixture }) + '/test'
    t.rejects(rimrafWindows(path, {}), { code: 'EPERM' })
    t.matchSnapshot(CHMODS.length, 'chmods')
    t.end()
  })
  t.end()
})

t.test('rimraffing root, do not actually rmdir root', async t => {
  let ROOT: string | undefined = undefined
  const { rimrafWindows, rimrafWindowsSync } = (await t.mockImport(
    '../dist/esm/rimraf-windows.js',
    {
      path: {
        ...PATH,
        parse: (path: string) => {
          const p = parse(path)
          if (path === ROOT) {
            p.root = path
          }
          return p
        },
      },
    }
  )) as typeof import('../dist/esm/rimraf-windows.js')
  t.test('async', async t => {
    ROOT = t.testdir(fixture)
    await rimrafWindows(ROOT, { preserveRoot: false })
    t.equal(FS.statSync(ROOT).isDirectory(), true, 'root still present')
    t.same(FS.readdirSync(ROOT), [], 'entries all gone')
  })
  t.test('sync', async t => {
    ROOT = t.testdir(fixture)
    rimrafWindowsSync(ROOT, { preserveRoot: false })
    t.equal(FS.statSync(ROOT).isDirectory(), true, 'root still present')
    t.same(FS.readdirSync(ROOT), [], 'entries all gone')
  })
  t.end()
})

t.test(
  'abort on signal',
  { skip: typeof AbortController === 'undefined' },
  t => {
    t.test('sync', t => {
      const d = t.testdir(fixture)
      const ac = new AbortController()
      const { signal } = ac
      ac.abort(new Error('aborted rimraf'))
      t.throws(() => rimrafWindowsSync(d, { signal }))
      t.end()
    })
    t.test('sync abort in filter', t => {
      const d = t.testdir(fixture)
      const ac = new AbortController()
      const { signal } = ac
      const opt = {
        signal,
        filter: (p: string, st: Stats | Dirent) => {
          if (basename(p) === 'g' && st.isFile()) {
            ac.abort(new Error('done'))
          }
          return true
        },
      }
      t.throws(() => rimrafWindowsSync(d, opt), { message: 'done' })
      t.end()
    })
    t.test('async', async t => {
      const d = t.testdir(fixture)
      const ac = new AbortController()
      const { signal } = ac
      const p = t.rejects(() => rimrafWindows(d, { signal }))
      ac.abort(new Error('aborted rimraf'))
      await p
    })
    t.test('async, pre-aborted', async t => {
      const ac = new AbortController()
      const { signal } = ac
      const d = t.testdir(fixture)
      ac.abort(new Error('aborted rimraf'))
      await t.rejects(() => rimrafWindows(d, { signal }))
    })
    t.end()
  }
)

t.test('filter function', t => {
  for (const f of ['i', 'j']) {
    t.test(`filter=${f}`, t => {
      t.test('sync', t => {
        const dir = t.testdir(fixture)
        const saw: string[] = []
        const filter = (p: string) => {
          saw.push(relative(process.cwd(), p).replace(/\\/g, '/'))
          return basename(p) !== f
        }
        rimrafWindowsSync(dir, { filter })
        t.matchSnapshot(
          [saw.sort((a, b) => a.localeCompare(b, 'en'))],
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
        const saw: string[] = []
        const filter = (p: string) => {
          saw.push(relative(process.cwd(), p).replace(/\\/g, '/'))
          return basename(p) !== f
        }
        await rimrafWindows(dir, { filter })
        t.matchSnapshot(
          [saw.sort((a, b) => a.localeCompare(b, 'en'))],
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
        const saw: string[] = []
        const filter = async (p: string) => {
          saw.push(relative(process.cwd(), p).replace(/\\/g, '/'))
          await new Promise(setImmediate)
          return basename(p) !== f
        }
        await rimrafWindows(dir, { filter })
        t.matchSnapshot(
          [saw.sort((a, b) => a.localeCompare(b, 'en'))],
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
    t.equal(rimrafWindowsSync(d + '/x', {}), true)
    statSync(d + '/z')
    statSync(d + '/z/a')
    statSync(d + '/z/b/c')
    t.end()
  })
  t.test('async', async t => {
    const d = t.testdir(fixture)
    t.equal(await rimrafWindows(d + '/x', {}), true)
    statSync(d + '/z')
    statSync(d + '/z/a')
    statSync(d + '/z/b/c')
  })
  t.end()
})
