// just disable the glob option, and promisify it, for apples-to-apples comp
const oldRimraf = () => {
  const {promisify} = require('util')
  const oldRimraf = require('./old-rimraf')
  const pOldRimraf = promisify(oldRimraf)
  const rimraf = path => pOldRimraf(path, { disableGlob: true })
  const sync = path => oldRimraf.sync(path, { disableGlob: true })
  return Object.assign(rimraf, { sync })
}

const { spawn, spawnSync } = require('child_process')
const systemRmRf = () => {
  const rimraf = path => new Promise((res, rej) => {
    const proc = spawn('rm', ['-rf', path])
    proc.on('close', (code, signal) => {
      if (code || signal)
        rej(Object.assign(new Error('command failed'), { code, signal }))
      else
        res()
    })
  })
  rimraf.sync = path => {
    const result = spawnSync('rm', ['-rf', path])
    if (result.status || result.signal) {
      throw Object.assign(new Error('command failed'), {
        code: result.status,
        signal: result.signal,
      })
    }
  }
  return rimraf
}

module.exports = {
  native: require('../').native,
  posix: require('../').posix,
  windows: require('../').windows,
  old: oldRimraf(),
  system: systemRmRf(),
}
