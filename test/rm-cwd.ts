import t from 'tap'
import {
  rimraf,
  rimrafSync,
  manual,
  manualSync,
  native,
  nativeSync,
  posix,
  posixSync,
  windows,
  windowsSync,
  moveRemove,
  moveRemoveSync,
} from '../src/index.js'
import { statSync } from 'node:fs'

for (const [name, impl] of Object.entries({
  rimraf,
  manual,
  native,
  posix,
  windows,
  moveRemove,
})) {
  t.test(name, async t => {
    t.chdir(t.testdir({ a: { b: { c: { d: { e: '' } } } } }))
    t.equal(statSync('a/b/c/d/e').isFile(), true)
    await impl('a/b/c/../.')
    t.throws(() => statSync('a/b'))
    await impl('a/.')
    t.throws(() => statSync('a'))
    await t.rejects(impl(''))
    t.equal(statSync(t.testdirName).isDirectory(), true)
    await impl('.')
    t.throws(() => statSync(t.testdirName))
  })
}

for (const [name, impl] of Object.entries({
  rimrafSync,
  manualSync,
  nativeSync,
  posixSync,
  windowsSync,
  moveRemoveSync,
})) {
  t.test(name, t => {
    t.chdir(t.testdir({ a: { b: { c: { d: { e: '' } } } } }))
    t.equal(statSync('a/b/c/d/e').isFile(), true)
    impl('a/b/c/../.')
    t.throws(() => statSync('a/b'))
    impl('a/.')
    t.throws(() => statSync('a'))
    t.throws(() => impl(''))
    t.equal(statSync(t.testdirName).isDirectory(), true)
    impl('.')
    t.throws(() => statSync(t.testdirName))
    t.end()
  })
}
