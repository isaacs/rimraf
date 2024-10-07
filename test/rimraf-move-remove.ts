import t from 'tap'
import { chmodSync, Stats, statSync } from 'fs'
import * as PATH from 'path'
import { basename, parse, relative } from 'path'
import {
  rimrafMoveRemove,
  rimrafMoveRemoveSync,
} from '../src/rimraf-move-remove.js'

t.formatSnapshot = (calls: string[][]) =>
  calls.map(args =>
    args.map(arg =>
      String(arg)
        .split(process.cwd())
        .join('{CWD}')
        .replace(/\\/g, '/')
        .replace(/.*\/(\.[a-z]\.)[^/]*$/, '{tmpfile}'),
    ),
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

t.test('actually delete some stuff', async t => {
  const fs = await import('../src/fs.js')
  const fsMock: Record<string, any> = { ...fs, promises: { ...fs.promises } }

  // simulate annoying windows semantics, where an unlink or rmdir
  // may take an arbitrary amount of time.  we only delay unlinks,
  // to ensure that we will get an error when we try to rmdir.
  const {
    statSync,
    promises: { unlink },
  } = fs

  const danglers: Promise<void>[] = []
  const unlinkLater = (path: string) => {
    const p = new Promise<void>(res => {
      setTimeout(() => unlink(path).then(res, res))
    })
    danglers.push(p)
  }
  fsMock.unlinkSync = (path: string) => unlinkLater(path)
  fsMock.promises.unlink = async (path: string) => unlinkLater(path)

  // but actually do wait to clean them up, though
  t.teardown(() => Promise.all(danglers))

  const { rimrafPosix, rimrafPosixSync } = (await t.mockImport(
    '../src/rimraf-posix.js',
    { '../src/fs.js': fsMock },
  )) as typeof import('../src/rimraf-posix.js')

  const { rimrafMoveRemove, rimrafMoveRemoveSync } = (await t.mockImport(
    '../src/rimraf-move-remove.js',
    { '../src/fs.js': fsMock },
  )) as typeof import('../src/rimraf-move-remove.js')

  t.test('posix does not work here', t => {
    t.test('sync', t => {
      const path = t.testdir(fixture)
      t.throws(() => rimrafPosixSync(path, {}))
      t.end()
    })
    t.test('async', t => {
      const path = t.testdir(fixture)
      t.rejects(() => rimrafPosix(path, {}))
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
      'deleting a second time is OK',
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

t.test('throw unlink errors', async t => {
  const fs = await import('../src/fs.js')
  // only throw once here, or else it messes with tap's fixture cleanup
  // that's probably a bug in t.mock?
  let threwAsync = false
  let threwSync = false
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = (await t.mockImport(
    '../src/rimraf-move-remove.js',
    {
      '../src/fs.js': t.createMock(fs, {
        unlinkSync: (path: string) => {
          if (threwSync) {
            return fs.unlinkSync(path)
          }
          threwSync = true
          throw Object.assign(new Error('cannot unlink'), { code: 'FOO' })
        },
        promises: {
          unlink: async (path: string) => {
            if (threwAsync) {
              return fs.promises.unlink(path)
            }
            threwAsync = true
            throw Object.assign(new Error('cannot unlink'), { code: 'FOO' })
          },
        },
      }),
    },
  )) as typeof import('../src/rimraf-move-remove.js')
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

t.test('ignore ENOENT unlink errors', async t => {
  const fs = await import('../src/fs.js')
  const threwAsync = false
  let threwSync = false
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = await t.mockImport(
    '../src/rimraf-move-remove.js',
    {
      '../src/fs.js': t.createMock(fs, {
        unlinkSync: (path: string) => {
          fs.unlinkSync(path)
          if (threwSync) {
            return
          }
          threwSync = true
          fs.unlinkSync(path)
        },
        promises: {
          unlink: async (path: string) => {
            fs.unlinkSync(path)
            if (threwAsync) {
              return
            }
            threwSync = true
            fs.unlinkSync(path)
          },
        },
      }),
    },
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
  const fs = await import('../src/fs.js')
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = await t.mockImport(
    '../src/rimraf-move-remove.js',
    {
      '../src/fs.js': t.createMock(fs, {
        rmdirSync: (_: string) => {
          throw Object.assign(new Error('cannot rmdir'), { code: 'FOO' })
        },
        promises: {
          rmdir: async (_: string) => {
            throw Object.assign(new Error('cannot rmdir'), { code: 'FOO' })
          },
        },
      }),
    },
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
  const fs = await import('../src/fs.js')
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = (await t.mockImport(
    '../src/rimraf-move-remove.js',
    {
      '../src/readdir-or-error.js': await t.mockImport(
        '../src/readdir-or-error.js',
        {
          '../src/fs.js': t.createMock(fs, {
            readdirSync: () => {
              throw Object.assign(new Error('cannot readdir'), { code: 'FOO' })
            },
            promises: {
              readdir: async () => {
                throw Object.assign(new Error('cannot readdir'), {
                  code: 'FOO',
                })
              },
            },
          }),
        },
      ),
    },
  )) as typeof import('../src/rimraf-move-remove.js')
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
  const path = await import('path')
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = (await t.mockImport(
    '../src/rimraf-move-remove.js',
    {
      path: t.createMock(path, {
        dirname: (path: string) => path,
      }),
    },
  )) as typeof import('../src/rimraf-move-remove.js')

  const d = t.testdir({})

  // not brave enough to pass the actual c:\\ here...
  t.throws(() => rimrafMoveRemoveSync(d, { tmp: d }), {
    message: 'cannot delete temp directory used for deletion',
  })
  t.rejects(() => rimrafMoveRemove(d, { tmp: d }), {
    message: 'cannot delete temp directory used for deletion',
  })
})

t.test('handle EPERMs on unlink by trying to chmod 0o666', async t => {
  const fs = await import('../src/fs.js')
  const CHMODS: any[] = []
  let threwAsync = false
  let threwSync = false
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = (await t.mockImport(
    '../src/rimraf-move-remove.js',
    {
      '../src/fix-eperm.js': await t.mockImport('../src/fix-eperm.js', {
        '../src/fs.js': t.createMock(fs, {
          chmodSync: (...args: any[]) => {
            CHMODS.push(['chmodSync', ...args])
            //@ts-ignore
            return fs.chmodSync(...args)
          },
          promises: {
            chmod: async (...args: any[]) => {
              CHMODS.push(['chmod', ...args])
              //@ts-ignore
              return fs.promises.chmod(...args)
            },
          },
        }),
      }),
      '../src/fs.js': t.createMock(fs, {
        unlinkSync: (path: string) => {
          if (threwSync) {
            return fs.unlinkSync(path)
          }
          threwSync = true
          throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
        },
        promises: {
          unlink: async (path: string) => {
            if (threwAsync) {
              return fs.promises.unlink(path)
            }
            threwAsync = true
            throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
          },
        },
      }),
    },
  )) as typeof import('../src/rimraf-move-remove.js')

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
  const fs = await import('../src/fs.js')
  const CHMODS: any[] = []
  let threwAsync = false
  let threwSync = false
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = (await t.mockImport(
    '../src/rimraf-move-remove.js',
    {
      '../src/fix-eperm.js': await t.mockImport('../src/fix-eperm.js', {
        '../src/fs.js': t.createMock(fs, {
          chmodSync: (...args: any[]) => {
            CHMODS.push(['chmodSync', ...args])
            try {
              fs.unlinkSync(args[0])
            } catch {}
            //@ts-ignore
            return fs.chmodSync(...args)
          },
          promises: {
            chmod: async (...args: any) => {
              CHMODS.push(['chmod', ...args])
              try {
                fs.unlinkSync(args[0])
              } catch {}
              //@ts-ignore
              return fs.promises.chmod(...args)
            },
          },
        }),
      }),
      '../src/fs.js': t.createMock(fs, {
        unlinkSync: (path: string) => {
          if (threwSync) {
            return fs.unlinkSync(path)
          }
          threwSync = true
          throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
        },
        promises: {
          unlink: async (path: string) => {
            if (threwAsync) {
              return fs.promises.unlink(path)
            }
            threwAsync = true
            throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
          },
        },
      }),
    },
  )) as typeof import('../src/rimraf-move-remove.js')

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
  const fs = await import('../src/fs.js')
  const CHMODS: any[] = []
  let threwAsync = false
  let threwSync = false
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = (await t.mockImport(
    '../src/rimraf-move-remove.js',
    {
      '../src/fix-eperm.js': await t.mockImport('../src/fix-eperm.js', {
        '../src/fs.js': t.createMock(fs, {
          chmodSync: (...args: any[]) => {
            CHMODS.push(['chmodSync', ...args])
            try {
              fs.unlinkSync(args[0])
            } catch {}
            throw Object.assign(new Error('cannot chmod'), { code: 'FOO' })
          },
          promises: {
            chmod: async (...args: any[]) => {
              CHMODS.push(['chmod', ...args])
              try {
                fs.unlinkSync(args[0])
              } catch {}
              throw Object.assign(new Error('cannot chmod'), { code: 'FOO' })
            },
          },
        }),
      }),
      '../src/fs.js': t.createMock(fs, {
        unlinkSync: (path: string) => {
          if (threwSync) {
            return fs.unlinkSync(path)
          }
          threwSync = true
          throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
        },
        promises: {
          unlink: async (path: string) => {
            if (threwAsync) {
              return fs.promises.unlink(path)
            }
            threwAsync = true
            throw Object.assign(new Error('cannot unlink'), { code: 'EPERM' })
          },
        },
      }),
    },
  )) as typeof import('../src/rimraf-move-remove.js')

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
  const fs = await import('../src/fs.js')
  let ROOT: undefined | string = undefined
  const { rimrafMoveRemove, rimrafMoveRemoveSync } = (await t.mockImport(
    '../src/rimraf-move-remove.js',
    {
      path: t.createMock(PATH, {
        parse: (path: string) => {
          const p = parse(path)
          if (path === ROOT) {
            p.root = path
          }
          return p
        },
      }),
    },
  )) as typeof import('../src/rimraf-move-remove.js')
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
  async t => {
    const { rimrafMoveRemove, rimrafMoveRemoveSync } = await t.mockImport(
      '../src/rimraf-move-remove.js',
    )
    t.test('sync', t => {
      const ac = new AbortController()
      const { signal } = ac
      ac.abort(new Error('aborted rimraf'))
      const d = t.testdir(fixture)
      t.throws(() => rimrafMoveRemoveSync(d, { signal }))
      t.end()
    })
    t.test('sync abort in filter', t => {
      const d = t.testdir(fixture)
      const ac = new AbortController()
      const { signal } = ac
      const opt = {
        signal,
        filter: (p: string, st: Stats) => {
          if (basename(p) === 'g' && st.isFile()) {
            ac.abort(new Error('done'))
          }
          return true
        },
      }
      t.throws(() => rimrafMoveRemoveSync(d, opt), { message: 'done' })
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
  },
)

t.test('filter function', async t => {
  for (const f of ['i', 'j']) {
    t.test(`filter=${f}`, t => {
      t.test('sync', t => {
        const dir = t.testdir(fixture)
        const saw: string[] = []
        const filter = (p: string) => {
          saw.push(relative(process.cwd(), p).replace(/\\/g, '/'))
          return basename(p) !== f
        }
        rimrafMoveRemoveSync(dir, { filter })
        t.matchSnapshot(
          [saw.sort((a, b) => a.localeCompare(b, 'en'))],
          'paths seen',
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
        await rimrafMoveRemove(dir, { filter })
        t.matchSnapshot(
          [saw.sort((a, b) => a.localeCompare(b, 'en'))],
          'paths seen',
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
        await rimrafMoveRemove(dir, { filter })
        t.matchSnapshot(
          [saw.sort((a, b) => a.localeCompare(b, 'en'))],
          'paths seen',
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
    t.equal(rimrafMoveRemoveSync(d + '/x', {}), true)
    statSync(d + '/z')
    statSync(d + '/z/a')
    statSync(d + '/z/b/c')
    t.end()
  })
  t.test('async', async t => {
    const d = t.testdir(fixture)
    t.equal(await rimrafMoveRemove(d + '/x', {}), true)
    statSync(d + '/z')
    statSync(d + '/z/a')
    statSync(d + '/z/b/c')
  })
  t.end()
})
