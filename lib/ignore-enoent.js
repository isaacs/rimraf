const ignoreENOENT = async p => p.catch(er => {
  if (er.code !== 'ENOENT')
    throw er
})

const ignoreENOENTSync = fn => {
  try {
    return fn()
  } catch (er) {
    if (er.code !== 'ENOENT')
      throw er
  }
}

module.exports = { ignoreENOENT, ignoreENOENTSync }
