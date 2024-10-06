import { chmodSync, promises } from './fs.js'
const { chmod } = promises

export const fixEPERM =
  <T>(fn: (path: string) => Promise<T>) =>
  async (path: string): Promise<void> => {
    try {
      return void (await fn(path))
    } catch (er) {
      const fer = er as NodeJS.ErrnoException
      if (fer?.code === 'ENOENT') {
        return
      }
      if (fer?.code === 'EPERM') {
        try {
          await chmod(path, 0o666)
        } catch (er2) {
          const fer2 = er2 as NodeJS.ErrnoException
          if (fer2?.code === 'ENOENT') {
            return
          }
          throw er
        }
        return void (await fn(path))
      }
      throw er
    }
  }

export const fixEPERMSync =
  <T>(fn: (path: string) => T) =>
  (path: string): void => {
    try {
      return void fn(path)
    } catch (er) {
      const fer = er as NodeJS.ErrnoException
      if (fer?.code === 'ENOENT') {
        return
      }
      if (fer?.code === 'EPERM') {
        try {
          chmodSync(path, 0o666)
        } catch (er2) {
          const fer2 = er2 as NodeJS.ErrnoException
          if (fer2?.code === 'ENOENT') {
            return
          }
          throw er
        }
        return void fn(path)
      }
      throw er
    }
  }
