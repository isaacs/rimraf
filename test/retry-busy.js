const {
  retryBusy,
  retryBusySync,
  MAXBACKOFF,
  RATE,
  MAXRETRIES,
  codes,
} = require('../dist/cjs/src/retry-busy.js')

const t = require('tap')

t.matchSnapshot(
  {
    MAXBACKOFF,
    RATE,
    MAXRETRIES,
    codes,
  },
  'default settings'
)

t.test('basic working operation when no errors happen', async t => {
  let calls = 0
  const arg = {}
  const opt = {}
  const method = (a, b) => {
    t.equal(a, arg, 'got first argument')
    t.equal(b, undefined, 'did not get another argument')
    calls++
  }
  const rBS = retryBusySync(method)
  rBS(arg, opt)
  t.equal(calls, 1)
  const rB = retryBusy(method)
  await rB(arg, opt).then(() => t.equal(calls, 2))
})

t.test('retry when known error code thrown', t => {
  t.plan(codes.size)

  for (const code of codes) {
    t.test(code, async t => {
      let thrown = false
      let calls = 0
      const arg = {}
      const opt = {}
      const method = (a, b) => {
        t.equal(a, arg, 'got first argument')
        t.equal(b, undefined, 'did not get another argument')
        if (!thrown) {
          thrown = true
          t.equal(calls, 0, 'first call')
          calls++
          throw Object.assign(new Error(code), { code })
        } else {
          t.equal(calls, 1, 'second call')
          calls++
          thrown = false
        }
      }
      const rBS = retryBusySync(method)
      rBS(arg, opt)
      t.equal(calls, 2)
      calls = 0
      const rB = retryBusy(method)
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
      const arg = {}
      const method = (a, b) => {
        t.equal(a, arg, 'got first argument')
        t.equal(b, undefined, 'did not get another argument')
        calls++
        throw Object.assign(new Error(code), { code })
      }
      const rBS = retryBusySync(method)
      t.throws(() => rBS(arg, opt), { code })
      t.equal(calls, 3)
      calls = 0
      const rB = retryBusy(method)
      await t.rejects(rB(arg, opt)).then(() => t.equal(calls, 3))
    })
  }
})

t.test('throw unknown error gives up right away', async t => {
  const arg = {}
  const opt = {}
  const method = (a, b) => {
    t.equal(a, arg, 'got first argument')
    t.equal(b, undefined, 'did not get another argument')
    throw Object.assign(new Error('nope'), { code: 'nope' })
  }
  const rBS = retryBusySync(method)
  t.throws(() => rBS(arg, opt), { code: 'nope' })
  const rB = retryBusy(method)
  await t.rejects(rB(arg, opt), { code: 'nope' })
})
