const t = require('tap')

// verify that every function in the root is *Sync, and every
// function is fs.promises is the promisified version of fs[method],
// and that when the cb returns an error, the promised version fails,
// and when the cb returns data, the promisified version resolves to it.
const fs = require('../lib/fs.js')
const realFS = require('fs')
const mockFSMethodPass = method => (...args) => {
  const cb = args.pop()
  process.nextTick(() => cb(null, method, 1, 2, 3))
}
const mockFSMethodFail = method => (...args) => {
  const cb = args.pop()
  process.nextTick(() => cb(new Error('oops'), method, 1, 2, 3))
}

t.type(fs.promises, Object)
const mockFSPass = {}
const mockFSFail = {}
for (const method of Object.keys(fs.promises)) {
  t.type(realFS[method], Function, `real fs.${method} is a function`)
  t.equal(fs[`${method}Sync`], realFS[`${method}Sync`], `has ${method}Sync`)

  // set up our pass/fails for the next tests
  mockFSPass[method] = mockFSMethodPass(method)
  mockFSFail[method] = mockFSMethodFail(method)
}

// doesn't have any sync versions that aren't promisified
for (const method of Object.keys(fs)) {
  if (method === 'promises')
    continue
  const m = method.replace(/Sync$/, '')
  t.type(fs.promises[m], Function, `fs.promises.${m} is a function`)
}

t.test('passing resolves promise', async t => {
  const fs = t.mock('../lib/fs.js', { fs: mockFSPass })
  for (const [m, fn] of Object.entries(fs.promises))
    t.same(await fn(), m, `got expected value for ${m}`)
})

t.test('failing rejects promise', async t => {
  const fs = t.mock('../lib/fs.js', { fs: mockFSFail })
  for (const [m, fn] of Object.entries(fs.promises))
    t.rejects(fn(), { message: 'oops' }, `got expected value for ${m}`)
})
