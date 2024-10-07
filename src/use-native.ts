import { RimrafAsyncOptions, RimrafOptions } from './index.js'

const versArr = process.version.replace(/^v/, '').split('.')

/* c8 ignore next */
const [major = 0, minor = 0] = versArr.map(v => parseInt(v, 10))
const hasNative = major > 14 || (major === 14 && minor >= 14)

// we do NOT use native by default on Windows, because Node's native
// rm implementation is less advanced.  Change this code if that changes.
export const useNative: (opt?: RimrafAsyncOptions) => boolean =
  !hasNative || process.platform === 'win32' ?
    () => false
  : opt => !opt?.signal && !opt?.filter
export const useNativeSync: (opt?: RimrafOptions) => boolean =
  !hasNative || process.platform === 'win32' ?
    () => false
  : opt => !opt?.signal && !opt?.filter
