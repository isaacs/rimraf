import { RimrafOptions } from '.'
import { promises, rmSync } from './fs.js'
const { rm } = promises

export const rimrafNative = async (
  path: string,
  opt: RimrafOptions
): Promise<boolean> => {
  await rm(path, {
    ...opt,
    force: true,
    recursive: true,
  })
  return true
}

export const rimrafNativeSync = (path: string, opt: RimrafOptions): boolean => {
  rmSync(path, {
    ...opt,
    force: true,
    recursive: true,
  })
  return true
}
