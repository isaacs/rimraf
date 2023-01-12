const t = require('tap')
t.test('actual platform', t => {
  t.equal(require('../dist/cjs/src/platform.js').default, process.platform)
  t.end()
})
t.test('fake platform', t => {
  process.env.__TESTING_RIMRAF_PLATFORM__ = 'not actual platform'
  t.equal(t.mock('../dist/cjs/src/platform.js').default, 'not actual platform')
  t.end()
})
