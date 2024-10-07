import { RimrafAsyncOptions, RimrafOptions } from './index.js'

// we do NOT use native by default on Windows, because Node's native
// rm implementation is less advanced.  Change this code if that changes.
export const useNative: (opt?: RimrafAsyncOptions) => boolean =
  process.platform === 'win32' ?
    () => false
  : opt => !opt?.signal && !opt?.filter
export const useNativeSync: (opt?: RimrafOptions) => boolean =
  process.platform === 'win32' ?
    () => false
  : opt => !opt?.signal && !opt?.filter
