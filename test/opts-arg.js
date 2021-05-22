const t = require('tap')
const optsArg = require('../lib/opts-arg.js')
const opts = { a: 1 }
t.equal(optsArg(opts), opts, 'returns object if provided')
t.same(optsArg(), {}, 'returns new object otherwise')
