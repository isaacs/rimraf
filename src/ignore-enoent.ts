export const ignoreENOENT = async <T, U = undefined>(
  p: Promise<T>,
  def?: U,
): Promise<T | U> =>
  p.catch(er => {
    if (er.code !== 'ENOENT') {
      throw er
    }
    return def as U
  })

export const ignoreENOENTSync = <T, U = undefined>(
  fn: () => T,
  def?: U,
): T | U => {
  try {
    return fn()
  } catch (er) {
    if ((er as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      throw er
    }
    return def as U
  }
}
