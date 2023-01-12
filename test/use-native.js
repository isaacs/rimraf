// node before 14.14 didn't native recursive fs.rm
if (/^v([0-8]\.|1[0-3]\.|14\.[0-9]\.|14\.1[1-3]\.)/.test(process.version)) {
  console.log('TAP version 13')
  console.log('1..0 # no native recursive fs.rm in this node version')
  process.exit(0)
}

const t = require('tap')
const { useNative, useNativeSync } = require('../dist/cjs/src/use-native.js')

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
