// just disable the glob option, and promisify it, for apples-to-apples comp
import { promisify } from 'util'
import { createRequire } from 'module'
const oldRimraf = () => {
  const oldRimraf = createRequire(import.meta.filename)('./old-rimraf')
  const pOldRimraf = promisify(oldRimraf)
  const rimraf = path => pOldRimraf(path, { disableGlob: true })
  const sync = path => oldRimraf.sync(path, { disableGlob: true })
  return Object.assign(rimraf, { sync })
}

import { spawn, spawnSync } from 'child_process'
const systemRmRf = () => {
  const rimraf = path =>
    new Promise((res, rej) => {
      const proc = spawn('rm', ['-rf', path])
      proc.on('close', (code, signal) => {
        if (code || signal)
          rej(Object.assign(new Error('command failed'), { code, signal }))
        else res()
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

import { native, posix, windows } from 'rimraf'
const cases = {
  native,
  posix,
  windows,
  old: oldRimraf(),
  system: systemRmRf(),
}
export const names = new Set(Object.keys(cases))
export default cases
