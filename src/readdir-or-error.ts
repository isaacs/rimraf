// returns an array of entries if readdir() works,
// or the error that readdir() raised if not.
import { promises, readdirSync } from './fs.js'
const { readdir } = promises

export const readdirOrError = (path: string) =>
  readdir(path).catch(er => er as NodeJS.ErrnoException)

export const readdirOrErrorSync = (path: string) => {
  try {
    return readdirSync(path)
  } catch (er) {
    return er as NodeJS.ErrnoException
  }
}
