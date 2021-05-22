const t = require('tap')
t.test('actual platform', t => {
  t.equal(require('../lib/platform.js'), process.platform)
  t.end()
})
t.test('fake platform', t => {
  process.env.__TESTING_RIMRAF_PLATFORM__ = 'not actual platform'
  t.equal(t.mock('../lib/platform.js'), 'not actual platform')
  t.end()
})
