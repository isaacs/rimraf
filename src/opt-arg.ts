import { GlobOptions } from 'glob'
import { assertRimrafOptions, RimrafOptions } from './index.js'
export default (
  opt: RimrafOptions = {}
): RimrafOptions & {
  glob?: GlobOptions & { withFileTypes: false }
} => {
  assertRimrafOptions(opt)
  const { glob, ...options } = opt
  if (!glob) return options
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
  }
}
