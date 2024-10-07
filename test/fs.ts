import t, { Test } from 'tap'

// verify that every function in the root is *Sync, and every
// function is fs.promises is the promisified version of fs[method],
// and that when the cb returns an error, the promised version fails,
// and when the cb returns data, the promisified version resolves to it.
import realFS from 'fs'
import * as fs from '../src/fs.js'
import { useNative } from '../src/use-native.js'

type MockFs = Record<string, (...a: any[]) => any>

const mockFs = async (t: Test, mock: MockFs) =>
  (await t.mockImport('../src/fs.js', {
    fs: t.createMock(realFS, mock),
  })) as typeof import('../src/fs.js')

const mockFSMethodPass =
  (method: string) =>
  (...args: any[]) => {
    const cb = args.pop()
    process.nextTick(() => cb(null, method))
  }
const mockFSMethodFail =
  (method: string) =>
  (...args: any[]) => {
    const cb = args.pop()
    process.nextTick(() => cb(new Error('oops'), method))
  }

t.type(fs.promises, Object)
const mockFSPass: MockFs = {}
const mockFSFail: MockFs = {}

for (const method of Object.keys(fs.promises as MockFs)) {
  // of course fs.rm is missing when we shouldn't use native :)
  // also, readdirSync is clubbed to always return file types
  if (method !== 'rm' || useNative()) {
    t.type(
      (realFS as { [k: string]: any })[method],
      Function,
      `real fs.${method} is a function`,
    )
    if (method !== 'readdir') {
      t.equal(
        (fs as { [k: string]: any })[`${method}Sync`],
        (realFS as unknown as MockFs)[`${method}Sync`],
        `has ${method}Sync`,
      )
    }
  }

  // set up our pass/fails for the next tests
  mockFSPass[method] = mockFSMethodPass(method)
  mockFSFail[method] = mockFSMethodFail(method)
}

// doesn't have any sync versions that aren't promisified
for (const method of Object.keys(fs)) {
  if (method === 'promises') {
    continue
  }
  const m = method.replace(/Sync$/, '')
  t.type((fs.promises as MockFs)[m], Function, `fs.promises.${m} is a function`)
}

t.test('passing resolves promise', async t => {
  const fs = await mockFs(t, mockFSPass)
  for (const [m, fn] of Object.entries(fs.promises as MockFs)) {
    const expected =
      ['chmod', 'rename', 'rm', 'rmdir', 'unlink'].includes(m) ? undefined : m
    t.same(await fn(), expected, `got expected value for ${m}`)
  }
})

t.test('failing rejects promise', async t => {
  const fs = await mockFs(t, mockFSFail)
  for (const [m, fn] of Object.entries(fs.promises as MockFs)) {
    t.rejects(fn(), { message: 'oops' }, `got expected value for ${m}`)
  }
})

t.test('readdirSync', async t => {
  const args: any[][] = []
  const fs = await mockFs(t, { readdirSync: (...a) => args.push(a) })
  fs.readdirSync('x')
  t.strictSame(args, [['x', { withFileTypes: true }]])
})
