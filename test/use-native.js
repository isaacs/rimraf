// node before 14.14 didn't native recursive fs.rm
if (/^v([0-8]\.|1[0-3]\.|14\.[0-9]\.|14\.1[1-3]\.)/.test(process.version)) {
  console.log('TAP version 13')
  console.log('1..0 # no native recursive fs.rm in this node version')
  process.exit(0)
}

const t = require('tap')
const { useNative, useNativeSync } = require('../dist/cjs/src/use-native.js')

if (!process.env.__TESTING_RIMRAF_EXPECT_USE_NATIVE__) {
  t.spawn(process.execPath, [__filename], {
    env: {
      ...process.env,
      __TESTING_RIMRAF_PLATFORM__: 'darwin',
      __TESTING_RIMRAF_NODE_VERSION__: 'v18.0.0',
      __TESTING_RIMRAF_EXPECT_USE_NATIVE__: '1',
    },
  })

  t.spawn(process.execPath, [__filename], {
    env: {
      ...process.env,
      __TESTING_RIMRAF_PLATFORM__: 'win32',
      __TESTING_RIMRAF_NODE_VERSION__: 'v18.0.0',
      __TESTING_RIMRAF_EXPECT_USE_NATIVE__: '0',
    },
  })

  t.spawn(process.execPath, [__filename], {
    env: {
      ...process.env,
      __TESTING_RIMRAF_NODE_VERSION__: 'v8.9.10',
      __TESTING_RIMRAF_PLATFORM__: 'darwin',
      __TESTING_RIMRAF_EXPECT_USE_NATIVE__: '0',
    },
  })

  t.spawn(process.execPath, [__filename], {
    env: {
      ...process.env,
      __TESTING_RIMRAF_NODE_VERSION__: 'v14.13.12',
      __TESTING_RIMRAF_PLATFORM__: 'darwin',
      __TESTING_RIMRAF_EXPECT_USE_NATIVE__: '0',
    },
  })
} else {
  const expect = process.env.__TESTING_RIMRAF_EXPECT_USE_NATIVE__ === '1'
  t.equal(useNative(), expect)
  t.equal(useNativeSync(), expect)
}
