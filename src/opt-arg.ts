import { GlobOptions } from 'glob'
import {
  assertRimrafOptions,
  RimrafAsyncOptions,
  RimrafOptions,
  RimrafSyncOptions,
} from './index.js'

const optArgT = <T extends RimrafOptions>(
  opt: T
):
  | (T & {
      glob: GlobOptions & { withFileTypes: false }
    })
  | (T & { glob: undefined }) => {
  assertRimrafOptions(opt)
  const { glob, ...options } = opt
  if (!glob) {
    return options as T & { glob: undefined }
  }
  const globOpt =
    glob === true
      ? opt.signal
        ? { signal: opt.signal }
        : {}
      : opt.signal
      ? {
          signal: opt.signal,
          ...glob,
        }
      : glob
  return {
    ...options,
    glob: {
      ...globOpt,
      // always get absolute paths from glob, to ensure
      // that we are referencing the correct thing.
      absolute: true,
      withFileTypes: false,
    },
  } as T & { glob: GlobOptions & { withFileTypes: false } }
}

export const optArg = (opt: RimrafAsyncOptions = {}) => optArgT(opt)
export const optArgSync = (opt: RimrafSyncOptions = {}) => optArgT(opt)
