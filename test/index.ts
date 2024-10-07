import { statSync } from 'fs'
import { resolve } from 'path'
import t from 'tap'
import {
  rimraf,
  RimrafAsyncOptions,
  RimrafOptions,
  rimrafSync,
  RimrafSyncOptions,
} from '../src/index.js'

import * as OPTARG from '../src/opt-arg.js'

const mockRimraf =
  (fn: (path: string, opt: RimrafOptions) => void) =>
  async (path: string, opt: RimrafOptions) => {
    fn(path, opt)
    return true
  }

const mockRimrafSync =
  (fn: (path: string, opt: RimrafOptions) => void) =>
  (path: string, opt: RimrafOptions) => {
    fn(path, opt)
    return true
  }

t.test('mocky unit tests to select the correct function', async t => {
  // don't mock rimrafManual, so we can test the platform switch
  const CALLS: (
    | [string, string, RimrafOptions]
    | [string, string | RimrafOptions]
  )[] = []
  let USE_NATIVE = true
  const mocks = {
    '../src/use-native.js': {
      useNative: (opt: RimrafOptions) => {
        CALLS.push(['useNative', opt])
        return USE_NATIVE
      },
      useNativeSync: (opt: RimrafOptions) => {
        CALLS.push(['useNativeSync', opt])
        return USE_NATIVE
      },
    },
    '../src/path-arg.js': (path: string) => {
      CALLS.push(['pathArg', path])
      return path
    },
    '../src/opt-arg.js': {
      ...OPTARG,
      optArg: (opt: RimrafOptions) => {
        CALLS.push(['optArg', opt])
        return opt
      },
      optArgSync: (opt: RimrafOptions) => {
        CALLS.push(['optArg', opt])
        return opt
      },
    },
    '../src/rimraf-posix.js': {
      rimrafPosix: mockRimraf((path, opt) => {
        CALLS.push(['rimrafPosix', path, opt])
      }),
      rimrafPosixSync: mockRimrafSync((path, opt) => {
        CALLS.push(['rimrafPosixSync', path, opt])
      }),
    },
    '../src/rimraf-windows.js': {
      rimrafWindows: mockRimraf((path, opt) => {
        CALLS.push(['rimrafWindows', path, opt])
      }),
      rimrafWindowsSync: mockRimrafSync((path, opt) => {
        CALLS.push(['rimrafWindowsSync', path, opt])
      }),
    },
    '../src/rimraf-native.js': {
      rimrafNative: mockRimraf((path, opt) => {
        CALLS.push(['rimrafNative', path, opt])
      }),
      rimrafNativeSync: mockRimrafSync((path, opt) => {
        CALLS.push(['rimrafNativeSync', path, opt])
      }),
    },
  }
  t.intercept(process, 'platform', { value: 'posix' })
  const { rimraf } = (await t.mockImport('../src/index.js', {
    ...mocks,
    '../src/rimraf-manual.js': (await t.mockImport(
      '../src/rimraf-manual.js',
      mocks,
    )) as typeof import('../src/rimraf-manual.js'),
  })) as typeof import('../src/index.js')

  t.afterEach(() => (CALLS.length = 0))
  for (const useNative of [true, false]) {
    t.test(`main function, useNative=${useNative}`, t => {
      USE_NATIVE = useNative
      void rimraf('path', { a: 1 } as RimrafAsyncOptions)
      rimraf.sync('path', { a: 2 } as RimrafSyncOptions)
      t.equal(rimraf.rimraf, rimraf)
      t.equal(rimraf.rimrafSync, rimraf.sync)
      t.matchSnapshot(CALLS)
      t.end()
    })
  }

  t.test('manual', t => {
    void rimraf.manual('path', { a: 3 } as RimrafAsyncOptions)
    rimraf.manual.sync('path', { a: 4 } as RimrafSyncOptions)
    t.equal(rimraf.manualSync, rimraf.manual.sync)
    t.matchSnapshot(CALLS)
    t.end()
  })

  t.test('native', t => {
    void rimraf.native('path', { a: 5 } as RimrafAsyncOptions)
    rimraf.native.sync('path', { a: 6 } as RimrafSyncOptions)
    t.equal(rimraf.nativeSync, rimraf.native.sync)
    t.matchSnapshot(CALLS)
    t.end()
  })

  t.test('posix', t => {
    void rimraf.posix('path', { a: 7 } as RimrafAsyncOptions)
    rimraf.posix.sync('path', { a: 8 } as RimrafSyncOptions)
    t.equal(rimraf.posixSync, rimraf.posix.sync)
    t.matchSnapshot(CALLS)
    t.end()
  })

  t.test('windows', t => {
    void rimraf.windows('path', { a: 9 } as RimrafAsyncOptions)
    rimraf.windows.sync('path', { a: 10 } as RimrafSyncOptions)
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
  const ASYNC_CALLS: [string, RimrafOptions][] = []
  const SYNC_CALLS: [string, RimrafOptions][] = []
  const { rimraf, rimrafSync } = (await t.mockImport('../src/index.js', {
    '../src/use-native.js': {
      useNative: () => true,
      useNativeSync: () => true,
    },
    '../src/rimraf-native.js': {
      rimrafNative: mockRimraf((path, opt) => {
        ASYNC_CALLS.push([path, opt])
      }),
      rimrafNativeSync: mockRimrafSync((path, opt) => {
        SYNC_CALLS.push([path, opt])
      }),
    },
  })) as typeof import('../src/index.js')
  t.equal(await rimraf(['a', 'b', 'c']), true)
  t.equal(await rimraf(['i', 'j', 'k'], { x: 'ya' } as RimrafOptions), true)
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
    } as RimrafSyncOptions),
    true,
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
