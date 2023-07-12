import t, { Test } from 'tap'

// verify that every function in the root is *Sync, and every
// function is fs.promises is the promisified version of fs[method],
// and that when the cb returns an error, the promised version fails,
// and when the cb returns data, the promisified version resolves to it.
import realFS from 'fs'
import realFSP from 'fs/promises'
import * as fs from '../src/fs.js'
import { useNative } from '../src/use-native.js'

type MockCb = (e: Error | null, m?: string) => void
type MockFsCb = Record<string, (cb: MockCb) => void>
type MockFsPromise = Record<string, () => Promise<void>>

const mockFs = async (t: Test, fs: MockFsCb = {}, fsp: MockFsPromise = {}) =>
  (await t.mockImport('../src/fs.js', {
    fs: t.createMock(realFS, fs),
    'fs/promises': t.createMock(realFSP, fsp),
  })) as typeof import('../src/fs.js')

const mockFSMethodPass =
  (method: string) =>
  (...args: unknown[]) => {
    process.nextTick(() => (args.at(-1) as MockCb)(null, method))
  }
const mockFSPromiseMethodPass =
  (_method: string) =>
  () => new Promise<void>((resolve, _reject) => {
    resolve()
  })
const mockFSMethodFail =
  (_: string) =>
  (...args: unknown[]) => {
    process.nextTick(() => (args.at(-1) as MockCb)(new Error('oops')))
  }
const mockFSPromiseMethodFail =
  (_method: string) =>
  () => new Promise<void>((_resolve, reject) => {
    reject(new Error('oops'))
  })

t.type(fs.promises, Object)
const mockFSPass: MockFsCb = {}
const mockFSFail: MockFsCb = {}
const mockFSPromisesFail: MockFsPromise = {}
const mockFSPromisesPass: MockFsPromise = {}

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
  mockFSPromisesPass[method] = mockFSPromiseMethodPass(method)
  mockFSFail[method] = mockFSMethodFail(method)
  mockFSPromisesFail[method] = mockFSPromiseMethodFail(method)
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
  const fs = await mockFs(t, mockFSPass, mockFSPromisesPass)
  for (const [m, fn] of Object.entries(
    fs.promises as unknown as MockFsPromise,
  )) {
    t.same(await fn(), undefined, `${m} is a Promise<void> method`)
  }
})

t.test('failing rejects promise', async t => {
  const fs = await mockFs(t, mockFSFail, mockFSPromisesFail)

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
