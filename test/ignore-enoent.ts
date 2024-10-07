import t from 'tap'
import { ignoreENOENT, ignoreENOENTSync } from '../src/ignore-enoent.js'

const enoent = () => Object.assign(new Error('no ent'), { code: 'ENOENT' })
const eperm = () => Object.assign(new Error('eperm'), { code: 'EPERM' })

t.test('async', async t => {
  t.resolves(ignoreENOENT(Promise.reject(enoent())), 'enoent is fine')
  t.rejects(
    ignoreENOENT(Promise.reject(eperm())),
    { code: 'EPERM' },
    'eperm is not',
  )
  const rethrow = new Error('rethrow')
  t.rejects(
    ignoreENOENT(Promise.reject(eperm()), rethrow),
    rethrow,
    'or rethrows passed in error',
  )
})

t.test('sync', t => {
  const throwEnoent = () => {
    throw enoent()
  }
  const throwEperm = () => {
    throw eperm()
  }
  t.doesNotThrow(() => ignoreENOENTSync(throwEnoent), 'enoent is fine sync')
  t.throws(
    () => ignoreENOENTSync(throwEperm),
    { code: 'EPERM' },
    'eperm is not fine sync',
  )
  const rethrow = new Error('rethrow')
  t.throws(
    () => ignoreENOENTSync(throwEperm, rethrow),
    rethrow,
    'or rethrows passed in error',
  )
  t.end()
})
