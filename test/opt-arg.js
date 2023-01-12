const t = require('tap')
const optArg = require('../dist/cjs/src/opt-arg.js').default
const opt = { a: 1 }
t.equal(optArg(opt), opt, 'returns object if provided')
t.same(optArg(), {}, 'returns new object otherwise')
