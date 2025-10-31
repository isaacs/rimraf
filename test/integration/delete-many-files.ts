// this isn't for coverage.  it's basically a smoke test, to ensure that
// we can delete a lot of files on CI in multiple platforms and node versions.
import t from 'tap'
import { statSync, mkdirSync, readdirSync } from '../../src/fs.js'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { manual } from '../../src/index.js'
const cases = { manual }

// run with RIMRAF_TEST_START_CHAR/_END_CHAR/_DEPTH environs to
// make this more or less aggressive.
const START = (process.env.RIMRAF_TEST_START_CHAR || 'a').charCodeAt(0)
const END = (process.env.RIMRAF_TEST_END_CHAR || 'f').charCodeAt(0)
const DEPTH = +(process.env.RIMRAF_TEST_DEPTH || '') || 4

const create = (path: string, depth = 0) => {
  mkdirSync(path)
  for (let i = START; i <= END; i++) {
    const c = String.fromCharCode(i)
    if (depth < DEPTH && i - START >= depth) {
      create(resolve(path, c), depth + 1)
    } else {
      writeFileSync(resolve(path, c), c)
    }
  }
  return path
}

const base = t.testdir(
  Object.fromEntries(
    Object.entries(cases).map(([name]) => [
      name,
      {
        sync: {},
        async: {},
      },
    ]),
  ),
)

t.test('create all fixtures', async t => {
  for (const name of Object.keys(cases)) {
    for (const type of ['sync', 'async']) {
      const path = `${base}/${name}/${type}/test`
      create(path)
      t.equal(statSync(path).isDirectory(), true, `${name}/${type} created`)
    }
  }
  await setTimeout(3000)
})

t.test('delete all fixtures', t => {
  for (const [name, rimraf] of Object.entries(cases)) {
    t.test(name, t => {
      t.test('async', async t => {
        const path = `${base}/${name}/async/test`
        await rimraf(path, {})
        t.throws(() => statSync(path), { code: 'ENOENT' }, 'fully removed')
        t.same(readdirSync(dirname(path)), [], 'no temp entries left behind')
      })

      t.test('sync', t => {
        const path = `${base}/${name}/sync/test`
        rimraf.sync(path, {})
        t.throws(() => statSync(path), { code: 'ENOENT' }, 'fully removed')
        t.same(readdirSync(dirname(path)), [], 'no temp entries left behind')
        t.end()
      })

      t.end()
    })
  }
  t.end()
})
