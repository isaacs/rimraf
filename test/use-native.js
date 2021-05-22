const t = require('tap')
// node before 14.14 didn't native recursive fs.rm
if (/^v([0-8]\.|1[0-3]\.|14\.[0-9]\.|14\.1[1-3]\.)/.test(process.version)) {
  t.plan(0, 'no native recursive fs.rm in this node version')
  process.exit(0)
}

const {useNative, useNativeSync} = require('../lib/use-native.js')

if (!process.env.__TESTING_RIMRAF_NODE_VERSION__) {
  t.spawn(process.execPath, [__filename], {
    env: {
      ...process.env,
      __TESTING_RIMRAF_NODE_VERSION__: 'v14.13.12',
    },
  })

  t.spawn(process.execPath, [__filename], {
    env: {
      ...process.env,
      __TESTING_RIMRAF_NODE_VERSION__: 'v8.9.10',
    },
  })

  // this one has the native impl
  t.equal(useNative(), true)
  t.equal(useNativeSync(), true)
} else {
  t.equal(useNative(), false)
  t.equal(useNativeSync(), false)
}
