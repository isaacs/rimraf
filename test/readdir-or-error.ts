import t from 'tap'
import { readdirOrError, readdirOrErrorSync } from '../src/readdir-or-error.js'

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
const cases: [string, string[] | { code: string }][] = [
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
      if (!Array.isArray(resAsync)) {
        throw new Error('expected array async result')
      }
      if (!Array.isArray(resSync)) {
        throw new Error('expected array sync result')
      }
      t.same(
        resAsync.map(e => e.name).sort(),
        expect.sort(),
        'got async result',
      )
      t.same(resSync.map(e => e.name).sort(), expect.sort(), 'got sync result')
    } else {
      t.match(resAsync, expect, 'got async result')
      t.match(resSync, expect, 'got sync result')
    }
  })
}
