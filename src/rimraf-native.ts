import { RimrafAsyncOptions, RimrafSyncOptions } from './index.js'
import { promises, rmSync } from './fs.js'
const { rm } = promises

// NB: node will raise the "no rm cwd" error for us

export const rimrafNative = async (
  path: string,
  opt: RimrafAsyncOptions,
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
  opt: RimrafSyncOptions,
): boolean => {
  rmSync(path, {
    ...opt,
    force: true,
    recursive: true,
  })
  return true
}
