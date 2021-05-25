// returns an array of entries if readdir() works,
// or the error that readdir() raised if not.
const {
  readdirSync,
  promises: {
    readdir,
  },
} = require('./fs.js')
const readdirOrError = path => readdir(path).catch(er => er)
const readdirOrErrorSync = (path) => {
  try {
    return readdirSync(path)
  } catch (er) {
    return er
  }
}

module.exports = {
  readdirOrError,
  readdirOrErrorSync,
}
