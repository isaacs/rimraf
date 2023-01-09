const {
  promises: { chmod },
  chmodSync,
} = require('./fs.js')

const fixEPERM = fn => async path => {
  try {
    return await fn(path)
  } catch (er) {
    if (er.code === 'ENOENT') {
      return
    }
    if (er.code === 'EPERM') {
      try {
        await chmod(path, 0o666)
      } catch (er2) {
        if (er2.code === 'ENOENT') {
          return
        }
        throw er
      }
      return await fn(path)
    }
    throw er
  }
}

const fixEPERMSync = fn => path => {
  try {
    return fn(path)
  } catch (er) {
    if (er.code === 'ENOENT') {
      return
    }
    if (er.code === 'EPERM') {
      try {
        chmodSync(path, 0o666)
      } catch (er2) {
        if (er2.code === 'ENOENT') {
          return
        }
        throw er
      }
      return fn(path)
    }
    throw er
  }
}

module.exports = {
  fixEPERM,
  fixEPERMSync,
}
