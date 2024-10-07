import { parse, resolve } from 'path'
import { inspect } from 'util'
import { RimrafAsyncOptions } from './index.js'

const pathArg = (path: string, opt: RimrafAsyncOptions = {}) => {
  const type = typeof path
  if (type !== 'string') {
    const ctor = path && type === 'object' && path.constructor
    const received =
      ctor && ctor.name ? `an instance of ${ctor.name}`
      : type === 'object' ? inspect(path)
      : `type ${type} ${path}`
    const msg =
      'The "path" argument must be of type string. ' + `Received ${received}`
    throw Object.assign(new TypeError(msg), {
      path,
      code: 'ERR_INVALID_ARG_TYPE',
    })
  }

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

  if (path === root && opt.preserveRoot !== false) {
    const msg = 'refusing to remove root directory without preserveRoot:false'
    throw Object.assign(new Error(msg), {
      path,
      code: 'ERR_PRESERVE_ROOT',
    })
  }

  if (process.platform === 'win32') {
    const badWinChars = /[*|"<>?:]/
    const { root } = parse(path)
    if (badWinChars.test(path.substring(root.length))) {
      throw Object.assign(new Error('Illegal characters in path.'), {
        path,
        code: 'EINVAL',
      })
    }
  }

  return path
}

export default pathArg
