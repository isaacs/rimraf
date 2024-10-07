import t from 'tap'
import { RimrafAsyncOptions, RimrafSyncOptions } from '../src/index.js'

const CALLS: any[] = []
const fs = {
  rmSync: (path: string, options: any) => {
    CALLS.push(['rmSync', path, options])
  },
  promises: {
    rm: async (path: string, options: any) => {
      CALLS.push(['rm', path, options])
    },
  },
}

const { rimrafNative, rimrafNativeSync } = (await t.mockImport(
  '../src/rimraf-native.js',
  {
    '../src/fs.js': fs,
  },
)) as typeof import('../src/rimraf-native.js')

t.test('calls the right node function', async t => {
  await rimrafNative('path', { x: 'y' } as unknown as RimrafAsyncOptions)
  rimrafNativeSync('path', { a: 'b' } as unknown as RimrafSyncOptions)
  t.matchSnapshot(CALLS)
})
