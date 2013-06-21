#!/usr/bin/env node

var rimraf = require('./')

if (process.argv.length === 3 && process.argv[2] && process.argv[2] != '--help' && !/^\-[a-z]*h[a-z]*$/.test(process.argv[2]) && process.argv[2] != 'help' && process.argv[2] != '/?') {
  rimraf.sync(process.argv[2])
} else {
  console.log('Usage: rimraf <path>')
  console.log()
  console.log('  Deletes all files and folders at "path" recursively.')
  console.log()
  console.log('Options:')
  console.log()
  console.log('  -h, --help    Display this usage info')
}