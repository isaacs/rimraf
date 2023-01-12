const version = process.env.__TESTING_RIMRAF_NODE_VERSION__ || process.version
const versArr = version.replace(/^v/, '').split('.')
const hasNative = +versArr[0] > 14 || (+versArr[0] === 14 && +versArr[1] >= 14)
export const useNative = !hasNative ? () => false : () => true
export const useNativeSync = !hasNative ? () => false : () => true
