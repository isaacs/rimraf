const platform = require('./platform.js')
const { resolve, parse } = require('path')
const pathArg = (path, opts = {}) => {
  if (/\0/.test(path)) {
    // simulate same failure that node raises
    const msg = 'path must be a string without null bytes'
    throw Object.assign(new TypeError(msg), {
      path,
      code: 'ERR_INVALID_ARG_VALUE',
    })
  }

  path = resolve(path)
  const { root } = parse(path)

  if (path === root && opts.preserveRoot !== false) {
    const msg = 'refusing to remove root directory without preserveRoot:false'
    throw Object.assign(new Error(msg), {
      path,
      code: 'ERR_PRESERVE_ROOT',
    })
  }

  if (platform === 'win32') {
    const badWinChars = /[*|"<>?:]/
    const {root} = parse(path)
    if (badWinChars.test(path.substr(root.length))) {
      throw Object.assign(new Error('Illegal characters in path.'), {
        path,
        code: 'EINVAL',
      })
    }
  }

  return path
}
module.exports = pathArg
