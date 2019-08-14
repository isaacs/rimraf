#!/usr/bin/env node

const rimraf = require('./')

let help = false
let dashdash = false
let noglob = false
const args = process.argv.slice(2).filter(arg => {
  if (dashdash)
    return !!arg
  else if (arg === '--')
    dashdash = true
  else if (arg === '--no-glob' || arg === '-G')
    noglob = true
  else if (arg === '--glob' || arg === '-g')
    noglob = false
  else if (arg.match(/^(-+|\/)(h(elp)?|\?)$/))
    help = true
  else
    return !!arg
})

const go = n => {
  if (n >= args.length)
    return
  const options = noglob ? { glob: false } : {}
  rimraf(args[n], options, er => {
    if (er)
      throw er
    go(n+1)
  })
}

if (help || args.length === 0) {
  // If they didn't ask for help, then this is not a "success"
  const log = help ? console.log : console.error
  log('Usage: rimraf <path> [<path> ...]')
  log('')
  log('  Deletes all files and folders at "path" recursively.')
  log('')
  log('Options:')
  log('')
  log('  -h, --help     Display this usage info')
  log('  -G, --no-glob  Do not expand glob patterns in arguments')
  log('  -g, --glob     Expand glob patterns in arguments (default)')
  process.exit(help ? 0 : 1)
} else
  go(0)
