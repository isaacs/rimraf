const { spawnSync } = require('child_process')
const { existsSync } = require('fs')
const { resolve } = require('path')
const cases = require('./rimrafs.js')
const runTest = require('./run-test.js')
const print = require('./print-results.js')

if (!existsSync(resolve(__dirname, 'node_modules'))) {
  spawnSync('npm', ['install'], { cwd: __dirname })
}

const rimraf = require('rimraf')
const main = async () => {
  // cleanup first.  since the windows impl works on all platforms,
  // use that.  it's only relevant if the folder exists anyway.
  rimraf.sync(__dirname + '/fixtures')
  const results = {}
  for (const name of Object.keys(cases)) {
    results[name] = await runTest(name)
  }
  rimraf.sync(__dirname + '/fixtures')
  return results
}

main().then(print)
