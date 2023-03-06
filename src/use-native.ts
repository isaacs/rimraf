const version = process.env.__TESTING_RIMRAF_NODE_VERSION__ || process.version
const versArr = version.replace(/^v/, '').split('.')
const hasNative = +versArr[0] > 14 || (+versArr[0] === 14 && +versArr[1] >= 14)
import { RimrafAsyncOptions, RimrafOptions } from './index.js'
// we do NOT use native by default on Windows, because Node's native
// rm implementation is less advanced.  Change this code if that changes.
import platform from './platform.js'
export const useNative: (opt?: RimrafAsyncOptions) => boolean =
  !hasNative || platform === 'win32'
    ? () => false
    : opt => !opt?.signal && !opt?.filter && !opt?.follow
export const useNativeSync: (opt?: RimrafOptions) => boolean =
  !hasNative || platform === 'win32'
    ? () => false
    : opt => !opt?.signal && !opt?.filter && !opt?.follow
