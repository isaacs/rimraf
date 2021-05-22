const t = require('tap')

t.same(require('../package.json').exports, { '.': './lib/index.js' },
  'nothing else exported except main')

t.test('mocky unit tests to select the correct function', t => {
  // don't mock rimrafManual, so we can test the platform switch
  const CALLS = []
  let USE_NATIVE = true
  const mocks = {
    '../lib/use-native.js': {
      useNative: opts => {
        CALLS.push(['useNative', opts])
        return USE_NATIVE
      },
      useNativeSync: opts => {
        CALLS.push(['useNativeSync', opts])
        return USE_NATIVE
      },
    },
    '../lib/path-arg.js': path => {
      CALLS.push(['pathArg', path])
      return path
    },
    '../lib/opts-arg.js': opts => {
      CALLS.push(['optsArg', opts])
      return opts
    },
    '../lib/rimraf-posix.js': {
      rimrafPosix: async (path, opts) => {
        CALLS.push(['rimrafPosix', path, opts])
      },
      rimrafPosixSync: async (path, opts) => {
        CALLS.push(['rimrafPosixSync', path, opts])
      },
    },
    '../lib/rimraf-windows.js': {
      rimrafWindows: async (path, opts) => {
        CALLS.push(['rimrafWindows', path, opts])
      },
      rimrafWindowsSync: async (path, opts) => {
        CALLS.push(['rimrafWindowsSync', path, opts])
      },
    },
    '../lib/rimraf-native.js': {
      rimrafNative: async (path, opts) => {
        CALLS.push(['rimrafNative', path, opts])
      },
      rimrafNativeSync: async (path, opts) => {
        CALLS.push(['rimrafNativeSync', path, opts])
      },
    },
  }
  process.env.__TESTING_RIMRAF_PLATFORM__ = 'posix'
  const rimraf = t.mock('../', mocks)

  t.afterEach(() => CALLS.length = 0)
  for (const useNative of [true, false]) {
    t.test(`main function, useNative=${useNative}`, t => {
      USE_NATIVE = useNative
      rimraf('path', {a: 1})
      rimraf.sync('path', {a: 2})
      t.equal(rimraf.rimraf, rimraf)
      t.equal(rimraf.rimrafSync, rimraf.sync)
      t.matchSnapshot(CALLS)
      t.end()
    })
  }

  t.test('manual', t => {
    rimraf.manual('path', {a: 3})
    rimraf.manual.sync('path', {a: 4})
    t.equal(rimraf.manualSync, rimraf.manual.sync)
    t.matchSnapshot(CALLS)
    t.end()
  })

  t.test('native', t => {
    rimraf.native('path', {a: 5})
    rimraf.native.sync('path', {a: 6})
    t.equal(rimraf.nativeSync, rimraf.native.sync)
    t.matchSnapshot(CALLS)
    t.end()
  })

  t.test('posix', t => {
    rimraf.posix('path', {a: 7})
    rimraf.posix.sync('path', {a: 8})
    t.equal(rimraf.posixSync, rimraf.posix.sync)
    t.matchSnapshot(CALLS)
    t.end()
  })

  t.test('windows', t => {
    rimraf.windows('path', {a: 9})
    rimraf.windows.sync('path', {a: 10})
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
  const rimraf = require('../')
  const { statSync } = require('fs')
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
