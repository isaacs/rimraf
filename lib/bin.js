#!/usr/bin/env node

const rimraf = require('./index.js')

const { version } = require('../package.json')

const runHelpForUsage = () =>
  console.error('run `rimraf --help` for usage information')

const help = `rimraf version ${version}

Usage: rimraf <path> [<path> ...]
Deletes all files and folders at "path", recursively.

Options:
  --                  Treat all subsequent arguments as paths
  -h --help           Display this usage info
  --preserve-root     Do not remove '/' (default)
  --no-preserve-root  Do not treat '/' specially

  --impl=<type>       Specify the implementationt to use.
                      rimraf: choose the best option
                      native: the C++ implementation in Node.js
                      manual: the platform-specific JS implementation
                      posix: the Posix JS implementation
                      windows: the Windows JS implementation

Implementation-specific options:
  --tmp=<path>        Folder to hold temp files for 'windows' implementation
  --max-retries=<n>   maxRetries for the 'native' implementation
  --retry-delay=<n>   retryDelay for the 'native' implementation
`

const { resolve, parse } = require('path')

const main = async (...args) => {
  if (process.env.__RIMRAF_TESTING_BIN_FAIL__ === '1')
    throw new Error('simulated rimraf failure')

  const opt = {}
  const paths = []
  let dashdash = false
  let impl = rimraf

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
      const val = arg.substr('--tmp='.length)
      opt.tmp = val
      continue
    } else if (/^--max-retries=/.test(arg)) {
      const val = +arg.substr('--max-retries='.length)
      opt.maxRetries = val
      continue
    } else if (/^--retry-delay=/.test(arg)) {
      const val = +arg.substr('--retry-delay='.length)
      opt.retryDelay = val
      continue
    } else if (/^--impl=/.test(arg)) {
      const val = arg.substr('--impl='.length)
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
        default:
          console.error(`unknown implementation: ${val}`)
          runHelpForUsage()
          return 1
      }
    } else if (/^-/.test(arg)) {
      console.error(`unknown option: ${arg}`)
      runHelpForUsage()
      return 1
    } else
      paths.push(arg)
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

module.exports = Object.assign(main, { help })
if (module === require.main) {
  const args = process.argv.slice(2)
  main(...args).then(code => process.exit(code), er => {
    console.error(er)
    process.exit(1)
  })
}
