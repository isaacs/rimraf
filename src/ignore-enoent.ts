import { errorCode } from './error.js'

export const ignoreENOENT = async <T>(p: Promise<T>, rethrow?: unknown) =>
  p.catch(er => {
    if (errorCode(er) === 'ENOENT') {
      return
    }
    throw rethrow ?? er
  })

export const ignoreENOENTSync = <T>(fn: () => T, rethrow?: unknown) => {
  try {
    return fn()
  } catch (er) {
    if (errorCode(er) === 'ENOENT') {
      return
    }
    throw rethrow ?? er
  }
}
