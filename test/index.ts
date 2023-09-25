import { statSync } from 'fs'
import {resolve} from 'path'
import t from 'tap'
import {
  RimrafAsyncOptions,
  RimrafOptions,
  RimrafSyncOptions,
  rimraf,
  rimrafSync
} from '../src/index.js'

t.test('mocky unit tests to select the correct function', async t => {
  // don't mock rimrafManual, so we can test the platform switch
  const CALLS: any[] = []
  let USE_NATIVE = true
  const mocks = {
    '../dist/esm/use-native.js': {
      useNative: (opt: RimrafOptions) => {
        CALLS.push(['useNative', opt])
        return USE_NATIVE
      },
      useNativeSync: (opt: RimrafOptions) => {
        CALLS.push(['useNativeSync', opt])
        return USE_NATIVE
      },
    },
    '../dist/esm/path-arg.js': (path: string) => {
      CALLS.push(['pathArg', path])
      return path
    },
    '../dist/esm/opt-arg.js': {
      optArg: (opt: RimrafOptions) => {
        CALLS.push(['optArg', opt])
        return opt
      },
      optArgSync: (opt: RimrafOptions) => {
        CALLS.push(['optArg', opt])
        return opt
      },
    },
    '../dist/esm/rimraf-posix.js': {
      rimrafPosix: async (path: string, opt: RimrafOptions) => {
        CALLS.push(['rimrafPosix', path, opt])
      },
      rimrafPosixSync: async (path: string, opt: RimrafOptions) => {
        CALLS.push(['rimrafPosixSync', path, opt])
      },
    },
    '../dist/esm/rimraf-windows.js': {
      rimrafWindows: async (path: string, opt: RimrafOptions) => {
        CALLS.push(['rimrafWindows', path, opt])
      },
      rimrafWindowsSync: async (path: string, opt: RimrafOptions) => {
        CALLS.push(['rimrafWindowsSync', path, opt])
      },
    },
    '../dist/esm/rimraf-native.js': {
      rimrafNative: async (path: string, opt: RimrafOptions) => {
        CALLS.push(['rimrafNative', path, opt])
      },
      rimrafNativeSync: async (path: string, opt: RimrafOptions) => {
        CALLS.push(['rimrafNativeSync', path, opt])
      },
    },
  }
  process.env.__TESTING_RIMRAF_PLATFORM__ = 'posix'
  const { rimraf } = (await t.mockImport(
    '../dist/esm/index.js',
    mocks
  )) as typeof import('../dist/esm/index.js')

  t.afterEach(() => (CALLS.length = 0))
  for (const useNative of [true, false]) {
    t.test(`main function, useNative=${useNative}`, t => {
      USE_NATIVE = useNative
      rimraf('path', { a: 1 } as unknown as RimrafAsyncOptions)
      rimraf.sync('path', { a: 2 } as unknown as RimrafSyncOptions)
      t.equal(rimraf.rimraf, rimraf)
      t.equal(rimraf.rimrafSync, rimraf.sync)
      t.matchSnapshot(CALLS)
      t.end()
    })
  }

  t.test('manual', t => {
    rimraf.manual('path', { a: 3 } as unknown as RimrafAsyncOptions)
    rimraf.manual.sync('path', { a: 4 } as unknown as RimrafSyncOptions)
    t.equal(rimraf.manualSync, rimraf.manual.sync)
    t.matchSnapshot(CALLS)
    t.end()
  })

  t.test('native', t => {
    rimraf.native('path', { a: 5 } as unknown as RimrafAsyncOptions)
    rimraf.native.sync('path', { a: 6 } as unknown as RimrafSyncOptions)
    t.equal(rimraf.nativeSync, rimraf.native.sync)
    t.matchSnapshot(CALLS)
    t.end()
  })

  t.test('posix', t => {
    rimraf.posix('path', { a: 7 } as unknown as RimrafAsyncOptions)
    rimraf.posix.sync('path', { a: 8 } as unknown as RimrafSyncOptions)
    t.equal(rimraf.posixSync, rimraf.posix.sync)
    t.matchSnapshot(CALLS)
    t.end()
  })

  t.test('windows', t => {
    rimraf.windows('path', { a: 9 } as unknown as RimrafAsyncOptions)
    rimraf.windows.sync('path', { a: 10 } as unknown as RimrafSyncOptions)
    t.equal(rimraf.windowsSync, rimraf.windows.sync)
    t.matchSnapshot(CALLS)
    t.end()
  })

  t.end()
})

t.test('actually delete some stuff', t => {
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
  t.test('sync', t => {
    const path = t.testdir(fixture)
    rimraf.sync(path)
    t.throws(() => statSync(path), { code: 'ENOENT' }, 'deleted')
    t.end()
  })
  t.test('async', async t => {
    const path = t.testdir(fixture)
    await rimraf(path)
    t.throws(() => statSync(path), { code: 'ENOENT' })
  })
  t.end()
})

t.test('accept array of paths as first arg', async t => {
  const ASYNC_CALLS: any[] = []
  const SYNC_CALLS: any[] = []
  const { rimraf, rimrafSync } = (await t.mockImport('../dist/esm/index.js', {
    '../dist/esm/use-native.js': {
      useNative: () => true,
      useNativeSync: () => true,
    },
    '../dist/esm/rimraf-native.js': {
      rimrafNative: async (path: string, opt: RimrafOptions) =>
        ASYNC_CALLS.push([path, opt]),
      rimrafNativeSync: (path: string, opt: RimrafOptions) =>
        SYNC_CALLS.push([path, opt]),
    },
  })) as typeof import('../dist/esm/index.js')
  t.equal(await rimraf(['a', 'b', 'c']), true)
  t.equal(
    await rimraf(['i', 'j', 'k'], { x: 'ya' } as unknown as RimrafOptions),
    true
  )
  t.same(ASYNC_CALLS, [
    [resolve('a'), {}],
    [resolve('b'), {}],
    [resolve('c'), {}],
    [resolve('i'), { x: 'ya' }],
    [resolve('j'), { x: 'ya' }],
    [resolve('k'), { x: 'ya' }],
  ])

  t.equal(rimrafSync(['x', 'y', 'z']), true)
  t.equal(
    rimrafSync(['m', 'n', 'o'], {
      cat: 'chai',
    } as unknown as RimrafSyncOptions),
    true
  )
  t.same(SYNC_CALLS, [
    [resolve('x'), {}],
    [resolve('y'), {}],
    [resolve('z'), {}],
    [resolve('m'), { cat: 'chai' }],
    [resolve('n'), { cat: 'chai' }],
    [resolve('o'), { cat: 'chai' }],
  ])
})

t.test('deleting globs', async t => {

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

  t.test('sync', t => {
    const cwd = t.testdir(fixture)
    rimrafSync('**/f/**/m', { glob: { cwd } })
    t.throws(() => statSync(cwd + '/c/f/i/m'))
    statSync(cwd + '/c/f/i/l')
    t.end()
  })
  t.test('async', async t => {
    const cwd = t.testdir(fixture)
    await rimraf('**/f/**/m', { glob: { cwd } })
    t.throws(() => statSync(cwd + '/c/f/i/m'))
    statSync(cwd + '/c/f/i/l')
  })

  t.end()
})
