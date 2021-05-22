const t = require('tap')

if (!process.env.__TESTING_RIMRAF_PLATFORM__) {
  const fake = process.platform === 'win32' ? 'posix' : 'win32'
  t.spawn(process.execPath, [__filename], {
    env: {
      ...process.env,
      __TESTING_RIMRAF_PLATFORM__: fake,
    },
  })
}

const platform = process.env.__TESTING_RIMRAF_PLATFORM__ || process.platform
const path = require('path')[platform] || require('path')
const pathArg = t.mock('../lib/path-arg.js', {
  path,
})
const {resolve} = path

t.equal(pathArg('a/b/c'), resolve('a/b/c'))
t.throws(() => pathArg('a\0b'), Error('path must be a string without null bytes'))
if (platform === 'win32') {
  const badPaths = [
    'c:\\a\\b:c',
    'c:\\a\\b*c',
    'c:\\a\\b?c',
    'c:\\a\\b<c',
    'c:\\a\\b>c',
    'c:\\a\\b|c',
    'c:\\a\\b"c',
  ]
  for (const path of badPaths) {
    const er = Object.assign(new Error('Illegal characters in path'), {
      path,
      code: 'EINVAL',
    })
    t.throws(() => pathArg(path), er)
  }
}
