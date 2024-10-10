import { errorCode } from './error.js'
import { chmodSync, promises } from './fs.js'
import { ignoreENOENT, ignoreENOENTSync } from './ignore-enoent.js'
const { chmod } = promises

export const fixEPERM =
  (fn: (path: string) => Promise<unknown>) =>
  async (path: string): Promise<void> => {
    try {
      return void (await ignoreENOENT(fn(path)))
    } catch (er) {
      if (errorCode(er) === 'EPERM') {
        if (
          !(await ignoreENOENT(
            chmod(path, 0o666).then(() => true),
            er,
          ))
        ) {
          return
        }
        return void (await fn(path))
      }
      throw er
    }
  }

export const fixEPERMSync =
  (fn: (path: string) => unknown) =>
  (path: string): void => {
    try {
      return void ignoreENOENTSync(() => fn(path))
    } catch (er) {
      if (errorCode(er) === 'EPERM') {
        if (!ignoreENOENTSync(() => (chmodSync(path, 0o666), true), er)) {
          return
        }
        return void fn(path)
      }
      throw er
    }
  }
