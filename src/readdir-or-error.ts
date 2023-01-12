// returns an array of entries if readdir() works,
// or the error that readdir() raised if not.
import { FsError, promises, readdirSync } from './fs'
const { readdir } = promises
export const readdirOrError = (path: string) =>
  readdir(path).catch(er => er as FsError)
export const readdirOrErrorSync = (path: string) => {
  try {
    return readdirSync(path)
  } catch (er) {
    return er as FsError
  }
}
