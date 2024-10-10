import t, { Test } from 'tap'

// verify that every function in the root is *Sync, and every
// function is fs.promises is the promisified version of fs[method],
// and that when the cb returns an error, the promised version fails,
// and when the cb returns data, the promisified version resolves to it.
import realFS from 'fs'
import * as fs from '../src/fs.js'
import { useNative } from '../src/use-native.js'

type MockCb = (e: Error | null, m?: string) => void
type MockFsCb = Record<string, (cb: MockCb) => void>
type MockFsPromise = Record<string, () => Promise<void>>

const mockFs = async (t: Test, mock: MockFsCb) =>
  (await t.mockImport('../src/fs.js', {
    fs: t.createMock(realFS, mock),
  })) as typeof import('../src/fs.js')

const mockFSMethodPass =
  (method: string) =>
  (...args: unknown[]) => {
    process.nextTick(() => (args.at(-1) as MockCb)(null, method))
  }
const mockFSMethodFail =
  () =>
  (...args: unknown[]) => {
    process.nextTick(() => (args.at(-1) as MockCb)(new Error('oops')))
  }

t.type(fs.promises, Object)
const mockFSPass: MockFsCb = {}
const mockFSFail: MockFsCb = {}

for (const method of Object.keys(fs.promises)) {
  // of course fs.rm is missing when we shouldn't use native :)
  // also, readdirSync is clubbed to always return file types
  if (method !== 'rm' || useNative()) {
    t.type(
      (realFS as unknown as MockFsCb)[method],
      Function,
      `real fs.${method} is a function`,
    )
    if (method !== 'readdir') {
      t.equal(
        (fs as unknown as MockFsCb)[`${method}Sync`],
        (realFS as unknown as MockFsCb)[`${method}Sync`],
        `has ${method}Sync`,
      )
    }
  }

  // set up our pass/fails for the next tests
  mockFSPass[method] = mockFSMethodPass(method)
  mockFSFail[method] = mockFSMethodFail()
}

// doesn't have any sync versions that aren't promisified
for (const method of Object.keys(fs)) {
  if (method === 'promises') {
    continue
  }
  const m = method.replace(/Sync$/, '')
  t.type(
    (fs.promises as unknown as MockFsCb)[m],
    Function,
    `fs.promises.${m} is a function`,
  )
}

t.test('passing resolves promise', async t => {
  const fs = await mockFs(t, mockFSPass)
  for (const [m, fn] of Object.entries(
    fs.promises as unknown as MockFsPromise,
  )) {
    const expected =
      ['chmod', 'rename', 'rm', 'rmdir', 'unlink'].includes(m) ? undefined : m
    t.same(await fn(), expected, `got expected value for ${m}`)
  }
})

t.test('failing rejects promise', async t => {
  const fs = await mockFs(t, mockFSFail)
  for (const [m, fn] of Object.entries(
    fs.promises as unknown as MockFsPromise,
  )) {
    t.rejects(fn(), { message: 'oops' }, `got expected value for ${m}`)
  }
})

t.test('readdirSync', async t => {
  const args: unknown[][] = []
  const fs = await mockFs(t, { readdirSync: (...a) => args.push(a) })
  fs.readdirSync('x')
  t.strictSame(args, [['x', { withFileTypes: true }]])
})
