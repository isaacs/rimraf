const t = require('tap')
const optArg = require('../dist/cjs/src/opt-arg.js').default
const opt = { a: 1 }
t.equal(optArg(opt), opt, 'returns object if provided')
t.same(optArg(), {}, 'returns new object otherwise')

t.throws(() => optArg(true))
t.throws(() => optArg(null))
t.throws(() => optArg('hello'))
t.throws(() => optArg({ maxRetries: 'banana' }))

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
                maxBackoff === undefined
              ) {
                continue
              }
              t.throws(() =>
                optArg({
                  preserveRoot,
                  maxRetries,
                  retryDelay,
                  backoff,
                  maxBackoff,
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
                optArg({
                  preserveRoot,
                  maxRetries,
                  retryDelay,
                  backoff,
                  maxBackoff,
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
