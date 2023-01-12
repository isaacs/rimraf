import { promises, chmodSync, FsError } from './fs'
const { chmod } = promises

export const fixEPERM =
  (fn: (path: string) => Promise<any>) => async (path: string) => {
    try {
      return await fn(path)
    } catch (er) {
      const fer = er as FsError
      if (fer?.code === 'ENOENT') {
        return
      }
      if (fer?.code === 'EPERM') {
        try {
          await chmod(path, 0o666)
        } catch (er2) {
          const fer2 = er2 as FsError
          if (fer2?.code === 'ENOENT') {
            return
          }
          throw er
        }
        return await fn(path)
      }
      throw er
    }
  }

export const fixEPERMSync = (fn: (path: string) => any) => (path: string) => {
  try {
    return fn(path)
  } catch (er) {
    const fer = er as FsError
    if (fer?.code === 'ENOENT') {
      return
    }
    if (fer?.code === 'EPERM') {
      try {
        chmodSync(path, 0o666)
      } catch (er2) {
        const fer2 = er2 as FsError
        if (fer2?.code === 'ENOENT') {
          return
        }
        throw er
      }
      return fn(path)
    }
    throw er
  }
}
