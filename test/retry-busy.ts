import {
  codes,
  MAXBACKOFF,
  MAXRETRIES,
  RATE,
  retryBusy,
  retryBusySync,
} from '../src/retry-busy.js'

import t from 'tap'

t.matchSnapshot(
  {
    MAXBACKOFF,
    RATE,
    MAXRETRIES,
    codes,
  },
  'default settings',
)

t.test('basic working operation when no errors happen', async t => {
  let calls = 0
  const arg: string = 'path'
  const opt = {}
  const method = (a: string, b?: unknown) => {
    t.equal(a, arg, 'got first argument')
    t.equal(b, undefined, 'did not get another argument')
    calls++
  }
  const asyncMethod = async (a: string, b?: unknown) => method(a, b)
  const rBS = retryBusySync(method)
  rBS(arg, opt)
  t.equal(calls, 1)
  const rB = retryBusy(asyncMethod)
  await rB(arg, opt).then(() => t.equal(calls, 2))
})

t.test('retry when known error code thrown', t => {
  t.plan(codes.size)

  for (const code of codes) {
    t.test(code, async t => {
      let thrown = false
      let calls = 0
      const arg = 'path'
      const opt = {}
      const method = (a: string, b?: unknown) => {
        t.equal(a, arg, 'got first argument')
        t.equal(b, undefined, 'did not get another argument')
        if (!thrown) {
          thrown = true
          t.equal(calls, 0, 'first call')
          calls++
          throw Object.assign(new Error(code), { path: a, code })
        } else {
          t.equal(calls, 1, 'second call')
          calls++
          thrown = false
        }
      }
      const asyncMethod = async (a: string, b?: unknown) => method(a, b)
      const rBS = retryBusySync(method)
      rBS(arg, opt)
      t.equal(calls, 2)
      calls = 0
      const rB = retryBusy(asyncMethod)
      await rB(arg, opt).then(() => t.equal(calls, 2))
    })
  }
})

t.test('retry and eventually give up', t => {
  t.plan(codes.size)
  const opt = {
    maxBackoff: 2,
    maxRetries: 2,
  }

  for (const code of codes) {
    t.test(code, async t => {
      let calls = 0
      const arg = 'path'
      const method = (a: string, b?: unknown) => {
        t.equal(a, arg, 'got first argument')
        t.equal(b, undefined, 'did not get another argument')
        calls++
        throw Object.assign(new Error(code), { path: a, code })
      }
      const asyncMethod = async (a: string, b?: unknown) => method(a, b)
      const rBS = retryBusySync(method)
      t.throws(() => rBS(arg, opt), { path: arg, code })
      t.equal(calls, 3)
      calls = 0
      const rB = retryBusy(asyncMethod)
      await t.rejects(rB(arg, opt)).then(() => t.equal(calls, 3))
    })
  }
})

t.test('throw unknown error gives up right away', async t => {
  const arg = 'path'
  const opt = {}
  const method = (a: string, b?: unknown) => {
    t.equal(a, arg, 'got first argument')
    t.equal(b, undefined, 'did not get another argument')
    throw Object.assign(new Error('nope'))
  }
  const asyncMethod = async (a: string, b?: unknown) => method(a, b)
  const rBS = retryBusySync(method)
  t.throws(() => rBS(arg, opt), { message: 'nope' })
  const rB = retryBusy(asyncMethod)
  await t.rejects(rB(arg, opt), { message: 'nope' })
})
