// returns an array of entries if readdir() works,
// or the error that readdir() raised if not.
import { asFsError } from './error.js'
import { promises, readdirSync } from './fs.js'
const { readdir } = promises

export const readdirOrError = (path: string) => readdir(path).catch(asFsError)
export const readdirOrErrorSync = (path: string) => {
  try {
    return readdirSync(path)
  } catch (er) {
    return asFsError(er)
  }
}
