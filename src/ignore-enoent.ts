import { errorCode } from './error.js'

export const ignoreENOENT = async <T>(p: Promise<T>) =>
  p.catch(er => {
    if (errorCode(er) === 'ENOENT') {
      return
    }
    throw er
  })

export const didIgnoreENOENT = async (p: Promise<unknown>, rethrow?: unknown) =>
  p
    .then(() => false)
    .catch(er => {
      if (errorCode(er) === 'ENOENT') {
        return true
      }
      throw rethrow ?? er
    })

export const ignoreENOENTSync = <T>(fn: () => T) => {
  try {
    return fn()
  } catch (er) {
    if (errorCode(er) === 'ENOENT') {
      return
    }
    throw er
  }
}

export const didIgnoreENOENTSync = (fn: () => unknown, rethrow?: unknown) => {
  try {
    fn()
    return false
  } catch (er) {
    if (errorCode(er) === 'ENOENT') {
      return true
    }
    throw rethrow ?? er
  }
}
