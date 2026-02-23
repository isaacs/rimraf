import * as PATH from 'path'
import t from 'tap'
import { inspect } from 'util'

for (const platform of ['win32', 'posix'] as const) {
  t.test(platform, async t => {
    t.intercept(process, 'platform', { value: platform })
    const path = PATH[platform] || PATH
    const { default: pathArg } = (await t.mockImport(
      '../src/path-arg.js',
      {
        path,
      },
    )) as typeof import('../src/path-arg.js')

    t.equal(pathArg('a/b/c'), path.resolve('a/b/c'))
    t.throws(
      () => pathArg('a\0b'),
      Error('path must be a string without null bytes'),
    )

    // Empty string validation - prevents accidental deletion of cwd
    // Note: whitespace-only paths like ' ' or '\t' are valid filenames
    t.throws(() => pathArg(''), {
      code: 'ERR_INVALID_ARG_VALUE',
      path: '',
      message: 'path cannot be empty string',
      name: 'TypeError',
    })
    // Whitespace-only paths are valid filenames and should resolve normally
    t.equal(pathArg('   '), path.resolve('   '))
    t.equal(pathArg('\t'), path.resolve('\t'))
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
    t.equal(pathArg('/', { preserveRoot: false }), path.resolve('/'))

    //@ts-expect-error
    t.throws(() => pathArg({}), {
      code: 'ERR_INVALID_ARG_TYPE',
      path: {},
      message:
        'The "path" argument must be of type string. ' +
        'Received an instance of Object',
      name: 'TypeError',
    })
    //@ts-expect-error
    t.throws(() => pathArg([]), {
      code: 'ERR_INVALID_ARG_TYPE',
      path: [],
      message:
        'The "path" argument must be of type string. ' +
        'Received an instance of Array',
      name: 'TypeError',
    })
    //@ts-expect-error
    t.throws(() => pathArg(Object.create(null) as object), {
      code: 'ERR_INVALID_ARG_TYPE',
      path: Object.create(null) as object,
      message:
        'The "path" argument must be of type string. ' +
        `Received ${inspect(Object.create(null))}`,
      name: 'TypeError',
    })
    //@ts-expect-error
    t.throws(() => pathArg(true), {
      code: 'ERR_INVALID_ARG_TYPE',
      path: true,
      message:
        'The "path" argument must be of type string. ' +
        `Received type boolean true`,
      name: 'TypeError',
    })
  })
}
