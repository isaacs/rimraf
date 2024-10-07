import { errorCode } from './error.js'
import { chmodSync, promises } from './fs.js'
import {
  ignoreENOENT,
  didIgnoreENOENT,
  ignoreENOENTSync,
  didIgnoreENOENTSync,
} from './ignore-enoent.js'
const { chmod } = promises

export const fixEPERM =
  (fn: (path: string) => Promise<unknown>) =>
  async (path: string): Promise<void> => {
    try {
      await ignoreENOENT(fn(path))
      return
    } catch (er) {
      if (errorCode(er) === 'EPERM') {
        if (await didIgnoreENOENT(chmod(path, 0o666), er)) {
          return
        }
        await fn(path)
        return
      }
      throw er
    }
  }

export const fixEPERMSync =
  (fn: (path: string) => unknown) =>
  (path: string): void => {
    try {
      ignoreENOENTSync(() => fn(path))
      return
    } catch (er) {
      if (errorCode(er) === 'EPERM') {
        if (didIgnoreENOENTSync(() => chmodSync(path, 0o666), er)) {
          return
        }
        fn(path)
        return
      }
      throw er
    }
  }
