import t from 'tap'
import actual from '../dist/esm/platform.js'
t.test('actual platform', t => {
  t.equal(actual, process.platform)
  t.end()
})
t.test('fake platform', async t => {
  process.env.__TESTING_RIMRAF_PLATFORM__ = 'not actual platform'
  t.equal(
    (await t.mockImport('../dist/esm/platform.js')).default,
    'not actual platform',
  )
  t.end()
})
