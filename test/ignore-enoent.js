const t = require('tap')
const {
  ignoreENOENT,
  ignoreENOENTSync,
} = require('../dist/cjs/src/ignore-enoent.js')

const enoent = Object.assign(new Error('no ent'), { code: 'ENOENT' })
const eperm = Object.assign(new Error('eperm'), { code: 'EPERM' })

const throwEnoent = () => {
  throw enoent
}
const throwEperm = () => {
  throw eperm
}

t.resolves(ignoreENOENT(Promise.reject(enoent)), 'enoent is fine')
t.rejects(
  ignoreENOENT(Promise.reject(eperm)),
  { code: 'EPERM' },
  'eperm is not'
)
t.doesNotThrow(() => ignoreENOENTSync(throwEnoent), 'enoent is fine sync')
t.throws(
  () => ignoreENOENTSync(throwEperm),
  { code: 'EPERM' },
  'eperm is not fine sync'
)
