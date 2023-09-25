import t from 'tap'
import { optArg as oa, optArgSync as oas } from '../dist/esm/opt-arg.js'
import { RimrafAsyncOptions, RimrafSyncOptions } from '../src/index.js'

const asyncOpt = { a: 1 } as unknown as RimrafAsyncOptions
const syncOpt = { s: 1 } as unknown as RimrafSyncOptions

t.same(oa(asyncOpt), asyncOpt, 'returns equivalent object if provided')
t.same(oas(syncOpt), oa(syncOpt), 'optArgSync does the same thing')
t.same(oa(), {}, 'returns new object otherwise')
t.same(oas(), {}, 'returns new object otherwise, sync')

//@ts-expect-error
t.throws(() => oa(true))
//@ts-expect-error
t.throws(() => oa(null))
//@ts-expect-error
t.throws(() => oa('hello'))
//@ts-expect-error
t.throws(() => oa({ maxRetries: 'banana' }))

t.test('every kind of invalid option value', t => {
  // skip them when it's undefined, and skip the case
  // where they're all undefined, otherwise try every
  // possible combination of the values here.
  const badBool = [undefined, 1, null, 'x', {}]
  const badNum = [undefined, true, false, null, 'x', '1', {}]
  const badStr = [undefined, { toString: () => 'hi' }, /hi/, Symbol.for('hi')]
  for (const preserveRoot of badBool) {
    for (const tmp of badStr) {
      for (const maxRetries of badNum) {
        for (const retryDelay of badNum) {
          for (const backoff of badNum) {
            for (const maxBackoff of badNum) {
              if (
                preserveRoot === undefined &&
                maxRetries === undefined &&
                retryDelay === undefined &&
                backoff === undefined &&
                maxBackoff === undefined &&
                tmp === undefined
              ) {
                continue
              }
              t.throws(() =>
                oa({
                  //@ts-expect-error
                  preserveRoot,
                  //@ts-expect-error
                  maxRetries,
                  //@ts-expect-error
                  retryDelay,
                  //@ts-expect-error
                  backoff,
                  //@ts-expect-error
                  maxBackoff,
                  //@ts-expect-error
                  tmp,
                })
              )
            }
          }
        }
      }
    }
  }
  t.end()
})

t.test('test every allowed combination', t => {
  const goodBool = [undefined, true, false]
  // note that a few of these actually aren't *valid*,
  // but it's verifying what the initial opt checker does.
  const goodNum = [undefined, 1, Math.pow(2, 32), -1]
  const goodStr = [undefined, 'hi']
  for (const preserveRoot of goodBool) {
    for (const tmp of goodStr) {
      for (const maxRetries of goodNum) {
        for (const retryDelay of goodNum) {
          for (const backoff of goodNum) {
            for (const maxBackoff of goodNum) {
              t.ok(
                oa({
                  preserveRoot,
                  maxRetries,
                  retryDelay,
                  backoff,
                  maxBackoff,
                  tmp,
                })
              )
            }
          }
        }
      }
    }
  }
  t.end()
})

t.test('glob option handling', t => {
  t.same(oa({ glob: true }), {
    glob: { absolute: true, withFileTypes: false },
  })
  const gws = oa({ signal: { x: 1 } as unknown as AbortSignal, glob: true })
  t.same(gws, {
    signal: { x: 1 },
    glob: { absolute: true, signal: { x: 1 }, withFileTypes: false },
  })
  t.equal(gws.signal, gws.glob?.signal)
  t.same(oa({ glob: { nodir: true } }), {
    glob: { absolute: true, nodir: true, withFileTypes: false },
  })
  const gwsg = oa({
    signal: { x: 1 } as unknown as AbortSignal,
    glob: { nodir: true },
  })
  t.same(gwsg, {
    signal: { x: 1 },
    glob: {
      absolute: true,
      nodir: true,
      withFileTypes: false,
      signal: { x: 1 },
    },
  })
  t.equal(gwsg.signal, gwsg.glob?.signal)
  t.same(
    oa({
      signal: { x: 1 } as unknown as AbortSignal,
      glob: { nodir: true, signal: { y: 1 } as unknown as AbortSignal },
    }),
    {
      signal: { x: 1 },
      glob: {
        absolute: true,
        nodir: true,
        signal: { y: 1 },
        withFileTypes: false,
      },
    }
  )
  t.end()
})
