export default test =>
  test.startsWith('/test/integration/') ? null : (
    (test.endsWith('/bin.ts') ? test.replace(/\.ts$/, '.mts') : test).replace(
      /^test/,
      'src',
    )
  )
