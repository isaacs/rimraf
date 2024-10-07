import { RimrafAsyncOptions, RimrafOptions } from './index.js'

const [major = 0, minor = 0] = process.version
  .replace(/^v/, '')
  .split('.')
  .map(v => parseInt(v, 10))
const hasNative = major > 14 || (major === 14 && minor >= 14)

// we do NOT use native by default on Windows, because Node's native
// rm implementation is less advanced.  Change this code if that changes.
const doNotUseNative =
  !hasNative || process.platform === 'win32' ? () => false : null

// signal and filter options are not available on native methods
const hasNativeOptions = (opt?: RimrafAsyncOptions | RimrafOptions) =>
  !opt?.signal && !opt?.filter

export const useNative =
  doNotUseNative ?? ((o?: RimrafAsyncOptions) => hasNativeOptions(o))
export const useNativeSync =
  doNotUseNative ?? ((o?: RimrafOptions) => hasNativeOptions(o))
