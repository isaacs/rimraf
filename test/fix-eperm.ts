import t from 'tap'

t.test('works if it works', async t => {
  const { fixEPERM, fixEPERMSync } = await t.mockImport('../dist/esm/fix-eperm.js', {}) as typeof import('../dist/esm/fix-eperm.js')
  const fixed = fixEPERM(async () => 1)
  await fixed('x').then(n => t.equal(n, 1))
  const fixedSync = fixEPERMSync(() => 1)
  t.equal(fixedSync('x'), 1)
})

t.test('throw non-EPERM just throws', async t => {
  const { fixEPERM, fixEPERMSync } = await t.mockImport('../dist/esm/fix-eperm.js', {}) as typeof import('../dist/esm/fix-eperm.js')
  const fixed = fixEPERM(() => {
    throw new Error('oops')
  })
  await t.rejects(fixed('x'), new Error('oops'))
  const fixedSync = fixEPERMSync(() => {
    throw new Error('oops')
  })
  t.throws(() => fixedSync('x'), new Error('oops'))
})

t.test('throw ENOENT returns void', async t => {
  const er = Object.assign(new Error('no ents'), { code: 'ENOENT' })
  const { fixEPERM, fixEPERMSync } = await t.mockImport('../dist/esm/fix-eperm.js', {}) as typeof import('../dist/esm/fix-eperm.js')
  const fixed = fixEPERM(() => {
    throw er
  })
  await fixed('x').then(n => t.equal(n, undefined))
  const fixedSync = fixEPERMSync(() => {
    throw er
  })
  t.equal(fixedSync('x'), undefined)
})

t.test('chmod and try again', async t => {
  const seen = new Set<string>()
  const finished = new Set<string>()
  const eperm = Object.assign(new Error('perm'), { code: 'EPERM' })
  const method = (p: string) => {
    if (!seen.has(p)) {
      seen.add(p)
      throw eperm
    } else {
      t.equal(chmods.has(p), true)
      t.equal(finished.has(p), false)
      finished.add(p)
    }
  }
  const asyncMethod = async (p: string) => method(p)
  const chmods = new Set()
  const chmodSync = (p: string, mode: number) => {
    t.equal(chmods.has(p), false)
    chmods.add(p)
    t.equal(mode, 0o666)
  }
  const chmod = async (p: string, mode: number) => chmodSync(p, mode)
  const { fixEPERM, fixEPERMSync } = await t.mockImport('../dist/esm/fix-eperm.js', {
    '../dist/esm/fs.js': {
      promises: { chmod },
      chmodSync,
    },
  }) as typeof import('../dist/esm/fix-eperm.js')
  const fixed = fixEPERM(asyncMethod)
  const fixedSync = fixEPERMSync(method)
  await fixed('async').then(n => t.equal(n, undefined))
  t.equal(fixedSync('sync'), undefined)
  t.equal(chmods.size, 2)
  t.equal(seen.size, 2)
  t.equal(finished.size, 2)
})

t.test('chmod ENOENT is fine, abort', async t => {
  const seen = new Set<string>()
  const finished = new Set<string>()
  const eperm = Object.assign(new Error('perm'), { code: 'EPERM' })
  const method = (p: string) => {
    if (!seen.has(p)) {
      seen.add(p)
      throw eperm
    } else {
      t.equal(chmods.has(p), true)
      t.equal(finished.has(p), false)
      finished.add(p)
    }
  }
  const asyncMethod = async (p: string) => method(p)
  const chmods = new Set()
  const chmodSync = (p: string, mode: number) => {
    t.equal(chmods.has(p), false)
    chmods.add(p)
    t.equal(mode, 0o666)
    throw Object.assign(new Error('no ent'), { code: 'ENOENT' })
  }
  const chmod = async (p:string, mode:number) => chmodSync(p, mode)
  const { fixEPERM, fixEPERMSync } = await t.mockImport('../dist/esm/fix-eperm.js', {
    '../dist/esm/fs.js': {
      promises: { chmod },
      chmodSync,
    },
  }) as typeof import('../dist/esm/fix-eperm.js')
  const fixed = fixEPERM(asyncMethod)
  const fixedSync = fixEPERMSync(method)
  await fixed('async').then(n => t.equal(n, undefined))
  t.equal(fixedSync('sync'), undefined)
  t.equal(chmods.size, 2)
  t.equal(seen.size, 2)
  t.equal(finished.size, 0)
})

t.test('chmod other than ENOENT is failure', async t => {
  const seen = new Set()
  const finished = new Set()
  const eperm = Object.assign(new Error('perm'), { code: 'EPERM' })
  const method = (p: string) => {
    if (!seen.has(p)) {
      seen.add(p)
      throw eperm
    } else {
      t.equal(chmods.has(p), true)
      t.equal(finished.has(p), false)
      finished.add(p)
    }
  }
  const asyncMethod = async (p: string) => method(p)
  const chmods = new Set()
  const chmodSync = (p:string, mode:number) => {
    t.equal(chmods.has(p), false)
    chmods.add(p)
    t.equal(mode, 0o666)
    throw Object.assign(new Error('ent bro'), { code: 'OHNO' })
  }
  const chmod = async (p:string, mode:number) => chmodSync(p, mode)
  const { fixEPERM, fixEPERMSync } = await t.mockImport('../dist/esm/fix-eperm.js', {
    '../dist/esm/fs.js': {
      promises: { chmod },
      chmodSync,
    },
  }) as typeof import('../dist/esm/fix-eperm.js')
  const fixed = fixEPERM(asyncMethod)
  const fixedSync = fixEPERMSync(method)
  await t.rejects(fixed('async'), { code: 'EPERM' })
  t.throws(() => fixedSync('sync'), { code: 'EPERM' })
  t.equal(chmods.size, 2)
  t.equal(seen.size, 2)
  t.equal(finished.size, 0)
})
