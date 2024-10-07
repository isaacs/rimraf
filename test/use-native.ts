import t from 'tap'

for (const [platform, expect] of [
  ['darwin', true],
  ['win32', false],
] as const) {
  t.test(platform, async t => {
    t.intercept(process, 'platform', { value: platform })
    const { useNative, useNativeSync } = (await t.mockImport(
      '../src/use-native.js',
    )) as typeof import('../src/use-native.js')
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
