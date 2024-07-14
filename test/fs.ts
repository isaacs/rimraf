import t from 'tap'

// verify that every function in the root is *Sync, and every
// function is fs.promises is the promisified version of fs[method],
// and that when the cb returns an error, the promised version fails,
// and when the cb returns data, the promisified version resolves to it.
import realFS from 'fs'
import realFSPromises from 'fs/promises'
import * as fs from '../dist/esm/fs.js'

const mockFSMethodPass =
  (method: string) =>
  (...args: any[]) => {
    const cb = args.pop()
    process.nextTick(() => cb(null, method, 1, 2, 3))
  }
const mockFSPromiseMethodPass = (method: string) => () =>
  new Promise(resolve => {
    resolve(method)
  })
const mockFSMethodFail =
  (method: string) =>
  (...args: any[]) => {
    const cb = args.pop()
    process.nextTick(() => cb(new Error('oops'), method, 1, 2, 3))
  }
const mockFSPromiseMethodFail = (_: string) => () =>
  new Promise((_, reject) => {
    reject(new Error('oops'))
  })

import { useNative } from '../dist/esm/use-native.js'
t.type(fs.promises, Object)
const mockFSPass: Record<string, (...a: any[]) => any> = {}
const mockFSFail: Record<string, (...a: any[]) => any> = {}
const mockFSPromisesPass: { [k: string]: (...a: any[]) => Promise<any> } = {}
const mockFSPromisesFail: { [k: string]: (...a: any[]) => Promise<any> } = {}

for (const method of Object.keys(
  fs.promises as Record<string, (...a: any[]) => any>,
)) {
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
        (realFS as unknown as { [k: string]: (...a: any[]) => any })[
          `${method}Sync`
        ],
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
    (fs.promises as { [k: string]: (...a: any[]) => any })[m],
    Function,
    `fs.promises.${m} is a function`,
  )
}

t.test('passing resolves promise', async t => {
  const fs = (await t.mockImport('../src/fs.js', {
    fs: { ...realFS, ...mockFSPass },
    'fs/promises': { ...realFSPromises, ...mockFSPromisesPass },
  })) as typeof import('../src/fs.js')
  for (const [m, fn] of Object.entries(
    fs.promises as { [k: string]: (...a: any) => Promise<any> },
  )) {
    t.same(await fn(), m, `got expected value for ${m}`)
  }
})

t.test('failing rejects promise', async t => {
  const fs = (await t.mockImport('../src/fs.js', {
    fs: { ...realFS, ...mockFSFail },
    'fs/promises': { ...realFSPromises, ...mockFSPromisesFail },
  })) as typeof import('../src/fs.js')
  for (const [m, fn] of Object.entries(
    fs.promises as { [k: string]: (...a: any[]) => Promise<any> },
  )) {
    t.rejects(fn(), { message: 'oops' }, `got expected value for ${m}`)
  }
})
