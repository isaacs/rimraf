import { FsError } from './fs.js'

export const ignoreENOENT = async (p: Promise<any>) =>
  p.catch(er => {
    if (er.code !== 'ENOENT') {
      throw er
    }
  })

export const ignoreENOENTSync = (fn: () => any) => {
  try {
    return fn()
  } catch (er) {
    if ((er as FsError)?.code !== 'ENOENT') {
      throw er
    }
  }
}
