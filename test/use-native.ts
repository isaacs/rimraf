import t from 'tap'

for (const [platform, version, expect] of [
  ['darwin', 'v18.0.0', true],
  ['win32', 'v18.0.0', false],
  ['win32', 'v8.9.10', false],
  ['win32', 'v14.13.12', false],
  ['win32', 'v', false],
] as const) {
  t.test(`${platform} ${version}`, async t => {
    t.intercept(process, 'platform', { value: platform })
    t.intercept(process, 'version', { value: version })
    const { useNative, useNativeSync } = await t.mockImport(
      '../src/use-native.js',
    )
    if (expect) {
      // always need manual if a signal is passed in
      const { signal } = new AbortController()
      t.equal(useNative({ signal }), false)
      t.equal(useNativeSync({ signal }), false)
      // always need manual if a filter is provided
      t.equal(useNative({ filter: () => true }), false)
      t.equal(useNativeSync({ filter: () => true }), false)
    }
    t.equal(useNative(), expect)
    t.equal(useNativeSync(), expect)
  })
}
