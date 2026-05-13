import * as PATH from 'path'
import t from 'tap'
import { pathToFileURL } from 'url'
import { inspect } from 'util'

for (const platform of ['win32', 'posix'] as const) {
  t.test(platform, async t => {
    t.intercept(process, 'platform', { value: platform })
    const path = PATH[platform] || PATH
    const sep = path.sep
    const { pathArg } = (await t.mockImport('../src/path-arg.js', {
      path,
    })) as typeof import('../src/path-arg.js')

    t.equal(pathArg('a/b/c'), 'a/b/c')
    t.throws(
      () => pathArg('a\0b'),
      Error('path must be a string without null bytes'),
    )
    if (platform === 'win32') {
      const badPaths = [
        'c:\\a\\b:c',
        'c:\\a\\b*c',
        'c:\\a\\b?c',
        'c:\\a\\b<c',
        'c:\\a\\b>c',
        'c:\\a\\b|c',
        'c:\\a\\b"c',
      ]
      for (const path of badPaths) {
        const er = Object.assign(new Error('Illegal characters in path'), {
          path,
          code: 'EINVAL',
        })
        t.throws(() => pathArg(path), er)
      }
    }

    t.throws(() => pathArg('/'), { code: 'ERR_PRESERVE_ROOT' })

    t.throws(() => pathArg('/', { preserveRoot: undefined }), {
      code: 'ERR_PRESERVE_ROOT',
    })
    t.equal(pathArg('/', { preserveRoot: false }), '/')

    //@ts-expect-error
    t.throws(() => pathArg({}), {
      code: 'ERR_INVALID_ARG_TYPE',
      path: {},
      message:
        'The "path" argument must be of type string, Buffer, or "file:" URL. ' +
        'Received an instance of Object',
      name: 'TypeError',
    })
    t.equal(pathArg(pathToFileURL(process.cwd())), process.cwd())
    t.equal(pathArg('.'), process.cwd())
    t.equal(pathArg(Buffer.from('a/b/c/../.')), `a${sep}b`)
    t.throws(() => pathArg(''), {
      message: "'ENOENT: no such file or directory, lstat ''",
      errno: -2,
      code: 'ENOENT',
      syscall: 'lstat',
      path: '',
    })
    t.throws(() => pathArg(new URL('https://example.com/')), {
      code: 'ERR_INVALID_ARG_TYPE',
      path: {},
      message:
        'The "path" argument must be of type string, Buffer, or "file:" URL. ' +
        `Received "https:" URL`,
      name: 'TypeError',
    })
    //@ts-expect-error
    t.throws(() => pathArg([]), {
      code: 'ERR_INVALID_ARG_TYPE',
      path: [],
      message:
        'The "path" argument must be of type string, Buffer, or "file:" URL. ' +
        'Received an instance of Array',
      name: 'TypeError',
    })
    //@ts-expect-error
    t.throws(() => pathArg(Object.create(null) as object), {
      code: 'ERR_INVALID_ARG_TYPE',
      path: Object.create(null) as object,
      message:
        'The "path" argument must be of type string, Buffer, or "file:" URL. ' +
        `Received ${inspect(Object.create(null))}`,
      name: 'TypeError',
    })
    //@ts-expect-error
    t.throws(() => pathArg(true), {
      code: 'ERR_INVALID_ARG_TYPE',
      path: true,
      message:
        'The "path" argument must be of type string, Buffer, or "file:" URL. ' +
        `Received type boolean true`,
      name: 'TypeError',
    })
  })
}
