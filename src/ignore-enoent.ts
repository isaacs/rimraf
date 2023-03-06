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
    if ((er as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      throw er
    }
  }
}
