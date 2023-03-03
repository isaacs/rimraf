import { RimrafAsyncOptions, RimrafSyncOptions } from '.'
import { promises, rmSync } from './fs.js'
const { rm } = promises

export const rimrafNative = async (
  path: string,
  opt: RimrafAsyncOptions
): Promise<boolean> => {
  await rm(path, {
    ...opt,
    force: true,
    recursive: true,
  })
  return true
}

export const rimrafNativeSync = (
  path: string,
  opt: RimrafSyncOptions
): boolean => {
  rmSync(path, {
    ...opt,
    force: true,
    recursive: true,
  })
  return true
}
