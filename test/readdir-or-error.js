const t = require('tap')
const {
  readdirOrError,
  readdirOrErrorSync,
} = require('../dist/cjs/src/readdir-or-error.js')

const path = t.testdir({
  file: 'file',
  empty: {},
  full: {
    x: 'x',
    y: 'y',
    z: 'z',
  },
})

// [path, expected]
const cases = [
  ['file', { code: 'ENOTDIR' }],
  ['empty', []],
  ['full', ['x', 'y', 'z']],
]

for (const [c, expect] of cases) {
  t.test(c, async t => {
    const p = `${path}/${c}`
    const resAsync = await readdirOrError(p)
    const resSync = readdirOrErrorSync(p)
    if (Array.isArray(expect)) {
      t.same(resAsync.sort(), expect.sort(), 'got async result')
      t.same(resSync.sort(), expect.sort(), 'got sync result')
    } else {
      t.match(resAsync, expect, 'got async result')
      t.match(resSync, expect, 'got sync result')
    }
  })
}
