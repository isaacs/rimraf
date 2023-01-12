#!/usr/bin/env node
import { version } from '../package.json'
import rimraf, { RimrafOptions } from './'

const runHelpForUsage = () =>
  console.error('run `rimraf --help` for usage information')

export const help = `rimraf version ${version}

Usage: rimraf <path> [<path> ...]
Deletes all files and folders at "path", recursively.

Options:
  --                  Treat all subsequent arguments as paths
  -h --help           Display this usage info
  --preserve-root     Do not remove '/' recursively (default)
  --no-preserve-root  Do not treat '/' specially

  --impl=<type>       Specify the implementationt to use.
                      rimraf: choose the best option
                      native: the C++ implementation in Node.js
                      manual: the platform-specific JS implementation
                      posix: the Posix JS implementation
                      windows: the Windows JS implementation
                      move-remove: a slower Windows JS fallback implementation

Implementation-specific options:
  --tmp=<path>        Folder to hold temp files for 'move-remove' implementation
  --max-retries=<n>   maxRetries for the 'native' and 'windows' implementations
  --retry-delay=<n>   retryDelay for the 'native' implementation, default 100
  --backoff=<n>       Exponential backoff factor for retries (default: 1.2)
`

import { parse, resolve } from 'path'

const main = async (...args: string[]) => {
  if (process.env.__RIMRAF_TESTING_BIN_FAIL__ === '1') {
    throw new Error('simulated rimraf failure')
  }

  const opt: RimrafOptions = {}
  const paths: string[] = []
  let dashdash = false
  let impl: (path: string | string[], opt?: RimrafOptions) => Promise<void> =
    rimraf

  for (const arg of args) {
    if (dashdash) {
      paths.push(arg)
      continue
    }
    if (arg === '--') {
      dashdash = true
      continue
    } else if (arg === '-h' || arg === '--help') {
      console.log(help)
      return 0
    } else if (arg === '--preserve-root') {
      opt.preserveRoot = true
      continue
    } else if (arg === '--no-preserve-root') {
      opt.preserveRoot = false
      continue
    } else if (/^--tmp=/.test(arg)) {
      const val = arg.substring('--tmp='.length)
      opt.tmp = val
      continue
    } else if (/^--max-retries=/.test(arg)) {
      const val = +arg.substring('--max-retries='.length)
      opt.maxRetries = val
      continue
    } else if (/^--retry-delay=/.test(arg)) {
      const val = +arg.substring('--retry-delay='.length)
      opt.retryDelay = val
      continue
    } else if (/^--backoff=/.test(arg)) {
      const val = +arg.substring('--backoff='.length)
      opt.backoff = val
      continue
    } else if (/^--impl=/.test(arg)) {
      const val = arg.substring('--impl='.length)
      switch (val) {
        case 'rimraf':
          impl = rimraf
          continue
        case 'native':
        case 'manual':
        case 'posix':
        case 'windows':
          impl = rimraf[val]
          continue
        case 'move-remove':
          impl = rimraf.moveRemove
          continue
        default:
          console.error(`unknown implementation: ${val}`)
          runHelpForUsage()
          return 1
      }
    } else if (/^-/.test(arg)) {
      console.error(`unknown option: ${arg}`)
      runHelpForUsage()
      return 1
    } else {
      paths.push(arg)
    }
  }

  if (opt.preserveRoot !== false) {
    for (const path of paths.map(p => resolve(p))) {
      if (path === parse(path).root) {
        console.error(`rimraf: it is dangerous to operate recursively on '/'`)
        console.error('use --no-preserve-root to override this failsafe')
        return 1
      }
    }
  }

  if (!paths.length) {
    console.error('rimraf: must provide a path to remove')
    runHelpForUsage()
    return 1
  }

  await impl(paths, opt)
  return 0
}
main.help = help

export default main

if (
  typeof require === 'function' &&
  typeof module === 'object' &&
  require.main === module
) {
  const args = process.argv.slice(2)
  main(...args).then(
    code => process.exit(code),
    er => {
      console.error(er)
      process.exit(1)
    }
  )
}
