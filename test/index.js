const t = require('tap')

t.same(
  require('../package.json').exports,
  {
    '.': {
      import: './dist/mjs/src/index.js',
      require: './dist/cjs/src/index.js',
    },
  },
  'nothing else exported except main'
)

t.test('mocky unit tests to select the correct function', t => {
  // don't mock rimrafManual, so we can test the platform switch
  const CALLS = []
  let USE_NATIVE = true
  const mocks = {
    '../dist/cjs/src/use-native.js': {
      useNative: opt => {
        CALLS.push(['useNative', opt])
        return USE_NATIVE
      },
      useNativeSync: opt => {
        CALLS.push(['useNativeSync', opt])
        return USE_NATIVE
      },
    },
    '../dist/cjs/src/path-arg.js': path => {
      CALLS.push(['pathArg', path])
      return path
    },
    '../dist/cjs/src/opt-arg.js': opt => {
      CALLS.push(['optArg', opt])
      return opt
    },
    '../dist/cjs/src/rimraf-posix.js': {
      rimrafPosix: async (path, opt) => {
        CALLS.push(['rimrafPosix', path, opt])
      },
      rimrafPosixSync: async (path, opt) => {
        CALLS.push(['rimrafPosixSync', path, opt])
      },
    },
    '../dist/cjs/src/rimraf-windows.js': {
      rimrafWindows: async (path, opt) => {
        CALLS.push(['rimrafWindows', path, opt])
      },
      rimrafWindowsSync: async (path, opt) => {
        CALLS.push(['rimrafWindowsSync', path, opt])
      },
    },
    '../dist/cjs/src/rimraf-native.js': {
      rimrafNative: async (path, opt) => {
        CALLS.push(['rimrafNative', path, opt])
      },
      rimrafNativeSync: async (path, opt) => {
        CALLS.push(['rimrafNativeSync', path, opt])
      },
    },
  }
  process.env.__TESTING_RIMRAF_PLATFORM__ = 'posix'
  const rimraf = t.mock('../', mocks).default

  t.afterEach(() => (CALLS.length = 0))
  for (const useNative of [true, false]) {
    t.test(`main function, useNative=${useNative}`, t => {
      USE_NATIVE = useNative
      rimraf('path', { a: 1 })
      rimraf.sync('path', { a: 2 })
      t.equal(rimraf.rimraf, rimraf)
      t.equal(rimraf.rimrafSync, rimraf.sync)
      t.matchSnapshot(CALLS)
      t.end()
    })
  }

  t.test('manual', t => {
    rimraf.manual('path', { a: 3 })
    rimraf.manual.sync('path', { a: 4 })
    t.equal(rimraf.manualSync, rimraf.manual.sync)
    t.matchSnapshot(CALLS)
    t.end()
  })

  t.test('native', t => {
    rimraf.native('path', { a: 5 })
    rimraf.native.sync('path', { a: 6 })
    t.equal(rimraf.nativeSync, rimraf.native.sync)
    t.matchSnapshot(CALLS)
    t.end()
  })

  t.test('posix', t => {
    rimraf.posix('path', { a: 7 })
    rimraf.posix.sync('path', { a: 8 })
    t.equal(rimraf.posixSync, rimraf.posix.sync)
    t.matchSnapshot(CALLS)
    t.end()
  })

  t.test('windows', t => {
    rimraf.windows('path', { a: 9 })
    rimraf.windows.sync('path', { a: 10 })
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
  const { rimraf } = require('../')
  const { statSync } = require('../dist/cjs/src/fs.js')
  t.test('sync', t => {
    const path = t.testdir(fixture)
    rimraf.sync(path)
    t.throws(() => statSync(path), { code: 'ENOENT' }, 'deleted')
    t.end()
  })
  t.test('async', async t => {
    const path = t.testdir(fixture)
    await rimraf(path)
    t.throws(() => statSync(path), { code: 'ENOENT' }, 'deleted')
  })
  t.end()
})

t.test('accept array of paths as first arg', async t => {
  const { resolve } = require('path')
  const ASYNC_CALLS = []
  const SYNC_CALLS = []
  const { rimraf, rimrafSync } = t.mock('../', {
    '../dist/cjs/src/use-native.js': {
      useNative: () => true,
      useNativeSync: () => true,
    },
    '../dist/cjs/src/rimraf-native.js': {
      rimrafNative: async (path, opt) => ASYNC_CALLS.push([path, opt]),
      rimrafNativeSync: (path, opt) => SYNC_CALLS.push([path, opt]),
    },
  })
  t.equal(await rimraf(['a', 'b', 'c']), undefined)
  t.equal(await rimraf(['i', 'j', 'k'], { x: 'ya' }), undefined)
  t.same(ASYNC_CALLS, [
    [resolve('a'), {}],
    [resolve('b'), {}],
    [resolve('c'), {}],
    [resolve('i'), { x: 'ya' }],
    [resolve('j'), { x: 'ya' }],
    [resolve('k'), { x: 'ya' }],
  ])

  t.equal(rimrafSync(['x', 'y', 'z']), undefined)
  t.equal(rimrafSync(['m', 'n', 'o'], { cat: 'chai' }), undefined)
  t.same(SYNC_CALLS, [
    [resolve('x'), {}],
    [resolve('y'), {}],
    [resolve('z'), {}],
    [resolve('m'), { cat: 'chai' }],
    [resolve('n'), { cat: 'chai' }],
    [resolve('o'), { cat: 'chai' }],
  ])
})
