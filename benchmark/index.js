import cases from './rimrafs.js'
import runTest from './run-test.js'
import print from './print-results.js'

import * as rimraf from '../dist/esm/index.js'
const main = async () => {
  // cleanup first.  since the windows impl works on all platforms,
  // use that.  it's only relevant if the folder exists anyway.
  rimraf.sync(import.meta.dirname + '/fixtures')
  const results = {}
  for (const name of Object.keys(cases)) {
    results[name] = await runTest(name)
  }
  rimraf.sync(import.meta.dirname + '/fixtures')
  return results
}

main().then(print)
