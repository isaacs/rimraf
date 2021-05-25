const version = process.env.__TESTING_RIMRAF_NODE_VERSION__ || process.version
const versArr = version.replace(/^v/, '').split('.')
const hasNative = +versArr[0] > 14 || +versArr[0] === 14 && +versArr[1] >= 14

// TODO: check opt.rm === fs.rm, and use manual if they've overridden it
const useNative = !hasNative ? () => false : () => true
const useNativeSync = !hasNative ? () => false : () => true

module.exports = {useNative, useNativeSync}
