import { RimrafOptions } from '.'
import { promises, rmSync } from './fs.js'
const { rm } = promises

export const rimrafNative = (path: string, opt: RimrafOptions) =>
  rm(path, {
    ...opt,
    force: true,
    recursive: true,
  })

export const rimrafNativeSync = (path: string, opt: RimrafOptions) =>
  rmSync(path, {
    ...opt,
    force: true,
    recursive: true,
  })
