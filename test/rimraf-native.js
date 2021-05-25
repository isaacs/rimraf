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

const {
  rimrafNative,
  rimrafNativeSync,
} = t.mock('../lib/rimraf-native.js', { '../lib/fs.js': fs })

t.test('calls the right node function', async t => {
  await rimrafNative('path', { x: 'y' })
  rimrafNativeSync('path', { a: 'b' })
  t.matchSnapshot(CALLS)
})
