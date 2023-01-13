const version = process.env.__TESTING_RIMRAF_NODE_VERSION__ || process.version
const versArr = version.replace(/^v/, '').split('.')
const hasNative = +versArr[0] > 14 || (+versArr[0] === 14 && +versArr[1] >= 14)
// we do NOT use native by default on Windows, because Node's native
// rm implementation is less advanced.  Change this code if that changes.
import platform from './platform'
export const useNative =
  !hasNative || platform === 'win32' ? () => false : () => true
export const useNativeSync =
  !hasNative || platform === 'win32' ? () => false : () => true
