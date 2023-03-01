const t = require('tap')

const CALLS = []
const fs = {
  rmSync: (path, options) => {
    CALLS.push(['rmSync', path, options])
  },
  promises: {
    rm: async (path, options) => {
      CALLS.push(['rm', path, options])
    },
  },
}

const { rimrafNative, rimrafNativeSync } = t.mock(
  '../dist/cjs/src/rimraf-native.js',
  {
    '../dist/cjs/src/fs.js': fs,
  }
)

t.test('calls the right node function', async t => {
  await rimrafNative('path', { x: 'y' })
  rimrafNativeSync('path', { a: 'b' })
  t.matchSnapshot(CALLS)
})
