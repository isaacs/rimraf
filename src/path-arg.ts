import { parse, resolve, normalize } from 'path'
import { inspect } from 'util'
import { RimrafAsyncOptions } from './index.js'
import { fileURLToPath } from 'url'

const dotPattern = /(?:^|\\|\/)\.\.?(?:$|\\|\/)/
const BufferToString = (b: ArrayBufferView) =>
  Buffer.prototype.toString.call(b, 'utf8')

export type PathLike = string | URL | ArrayBufferLike | Buffer

export function pathArg(
  path: PathLike,
  opt: RimrafAsyncOptions = {},
): string {
  if (ArrayBuffer.isView(path)) {
    path = BufferToString(path)
  } else if (path instanceof URL && path.protocol === 'file:') {
    path = fileURLToPath(path)
  }
  if (typeof path !== 'string') {
    const type = typeof path
    const ctor = path && type === 'object' && path.constructor
    const received =
      path instanceof URL ? `"${path.protocol}" URL object`
      : ctor && ctor.name ? `an instance of ${ctor.name}`
      : type === 'object' ? inspect(path)
      : `type ${type} ${path}`
    const msg =
      'The "path" argument must be of type string, Buffer, or "file:" URL. ' +
      `Received ${received}`
    throw Object.assign(new TypeError(msg), {
      path,
      code: 'ERR_INVALID_ARG_TYPE',
    })
  }
  if (dotPattern.test(path)) {
    path = normalize(path)
  }
  if (path === '.') path = process.cwd()

  if (/\0/.test(path)) {
    // simulate same failure that node raises
    const msg = 'path must be a string without null bytes'
    throw Object.assign(new TypeError(msg), {
      path,
      code: 'ERR_INVALID_ARG_VALUE',
    })
  }

  if (path === '') {
    throw Object.assign(
      new Error("'ENOENT: no such file or directory, lstat ''"),
      {
        errno: -2,
        code: 'ENOENT',
        syscall: 'lstat',
        path: '',
      },
    )
  }

  const rpath = resolve(path)
  const { root } = parse(rpath)

  if (rpath === root && opt.preserveRoot !== false) {
    const msg =
      'refusing to remove root directory without preserveRoot:false'
    throw Object.assign(new Error(msg), {
      path,
      code: 'ERR_PRESERVE_ROOT',
    })
  }

  if (process.platform === 'win32') {
    const badWinChars = /[*|"<>?:]/
    if (badWinChars.test(rpath.substring(root.length))) {
      throw Object.assign(new Error('Illegal characters in path.'), {
        path,
        code: 'EINVAL',
      })
    }
  }

  return path
}
