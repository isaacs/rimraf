import t from 'tap'

// node before 14.14 didn't native recursive fs.rm
if (/^v([0-8]\.|1[0-3]\.|14\.[0-9]\.|14\.1[1-3]\.)/.test(process.version)) {
  t.plan(0, 'no native recursive fs.rm in this node version')
  process.exit(0)
}

import { fileURLToPath } from 'url'
import { useNative, useNativeSync } from '../dist/esm/use-native.js'

const args = [...process.execArgv, fileURLToPath(import.meta.url)]

if (!process.env.__TESTING_RIMRAF_EXPECT_USE_NATIVE__) {
  t.spawn(
    process.execPath,
    args,
    {
      env: {
        ...process.env,
        __TESTING_RIMRAF_PLATFORM__: 'darwin',
        __TESTING_RIMRAF_NODE_VERSION__: 'v18.0.0',
        __TESTING_RIMRAF_EXPECT_USE_NATIVE__: '1',
      },
    },
    'darwin v18',
  )

  t.spawn(
    process.execPath,
    args,
    {
      env: {
        ...process.env,
        __TESTING_RIMRAF_PLATFORM__: 'win32',
        __TESTING_RIMRAF_NODE_VERSION__: 'v18.0.0',
        __TESTING_RIMRAF_EXPECT_USE_NATIVE__: '0',
      },
    },
    'win32 v18',
  )

  t.spawn(
    process.execPath,
    args,
    {
      env: {
        ...process.env,
        __TESTING_RIMRAF_NODE_VERSION__: 'v8.9.10',
        __TESTING_RIMRAF_PLATFORM__: 'darwin',
        __TESTING_RIMRAF_EXPECT_USE_NATIVE__: '0',
      },
    },
    'darwin v8',
  )

  t.spawn(
    process.execPath,
    args,
    {
      env: {
        ...process.env,
        __TESTING_RIMRAF_NODE_VERSION__: 'v14.13.12',
        __TESTING_RIMRAF_PLATFORM__: 'darwin',
        __TESTING_RIMRAF_EXPECT_USE_NATIVE__: '0',
      },
    },
    'darwin v14.13.12',
  )
} else {
  const expect = process.env.__TESTING_RIMRAF_EXPECT_USE_NATIVE__ === '1'
  if (expect) {
    // always need manual if a signal is passed in
    const signal =
      typeof AbortController !== 'undefined' ? new AbortController().signal : {}
    //@ts-ignore
    t.equal(useNative({ signal }), false)
    //@ts-ignore
    t.equal(useNativeSync({ signal }), false)

    // always need manual if a filter is provided
    t.equal(useNative({ filter: () => true }), false)
    t.equal(useNativeSync({ filter: () => true }), false)
  }
  t.equal(useNative(), expect)
  t.equal(useNativeSync(), expect)
}
