#!/usr/bin/env node

var rimraf = require('./')

var help = false
var dashdash = false
var noglob = false
var maxBusyTries = -1
var args = process.argv.slice(2).filter(function(arg) {
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
  else if (arg.startsWith('--maxBusyTries='))
    maxBusyTries = arg.split('=')[1]
  else
    return !!arg
})

if (help || args.length === 0) {
  // If they didn't ask for help, then this is not a "success"
  var log = help ? console.log : console.error
  log('Usage: rimraf <path> [<path> ...]')
  log('')
  log('  Deletes all files and folders at "path" recursively.')
  log('')
  log('Options:')
  log('')
  log('  -h, --help     Display this usage info')
  log('  -G, --no-glob  Do not expand glob patterns in arguments')
  log('  -g, --glob     Expand glob patterns in arguments (default)')
  log('  --maxBusyTries=<n> Retry on EBUSY,ENOEMPTY, or EPERM up to n times (on Windows systems)')
  process.exit(help ? 0 : 1)
} else
  go(0)

function go (n) {
  if (n >= args.length)
    return
  var options = {}
  if (noglob)
    options = { glob: false }
  if (maxBusyTries>=0)
    Object.assign(options, { maxBusyTries: maxBusyTries })
  rimraf(args[n], options, function (er) {
    if (er)
      throw er
    go(n+1)
  })
}
