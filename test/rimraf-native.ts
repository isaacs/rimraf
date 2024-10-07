import t from 'tap'
import { RimrafAsyncOptions, RimrafSyncOptions } from '../src/index.js'

const CALLS: [string, string, unknown][] = []
const { rimrafNative, rimrafNativeSync } = (await t.mockImport(
  '../src/rimraf-native.js',
  {
    '../src/fs.js': {
      rmSync: (path: string, options: unknown) => {
        CALLS.push(['rmSync', path, options])
      },
      promises: {
        rm: async (path: string, options: unknown) => {
          CALLS.push(['rm', path, options])
        },
      },
    },
  },
)) as typeof import('../src/rimraf-native.js')

t.test('calls the right node function', async t => {
  await rimrafNative('path', { x: 'y' } as RimrafAsyncOptions)
  rimrafNativeSync('path', { a: 'b' } as RimrafSyncOptions)
  t.matchSnapshot(CALLS)
})
