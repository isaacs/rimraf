import * as PATH from 'path'
import t from 'tap'
import { fileURLToPath } from 'url'
import { inspect } from 'util'

if (!process.env.__TESTING_RIMRAF_PLATFORM__) {
  const fake = process.platform === 'win32' ? 'posix' : 'win32'
  t.spawn(
    process.execPath,
    [...process.execArgv, fileURLToPath(import.meta.url)],
    {
      name: fake,
      env: {
        ...process.env,
        __TESTING_RIMRAF_PLATFORM__: fake,
      },
    }
  )
}

const platform = process.env.__TESTING_RIMRAF_PLATFORM__ || process.platform
const path = PATH[platform as 'win32' | 'posix'] || PATH
const { default: pathArg } = (await t.mockImport('../dist/esm/path-arg.js', {
  path,
})) as typeof import('../dist/esm/path-arg.js')

const { resolve } = path

t.equal(pathArg('a/b/c'), resolve('a/b/c'))
t.throws(
  () => pathArg('a\0b'),
  Error('path must be a string without null bytes')
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
t.equal(pathArg('/', { preserveRoot: false }), resolve('/'))

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
t.throws(() => pathArg(Object.create(null) as {}), {
  code: 'ERR_INVALID_ARG_TYPE',
  path: Object.create(null),
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
