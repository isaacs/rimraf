const START = process.env.RIMRAF_TEST_START_CHAR || 'a'
const END = process.env.RIMRAF_TEST_END_CHAR || 'f'
const DEPTH = +process.env.RIMRAF_TEST_DEPTH || 5
const N = +process.env.RIMRAF_TEST_ITERATIONS || 7

const cases = require('./rimrafs.js')

const create = require('./create-fixture.js')

const hrToMS = hr => Math.round(hr[0] * 1e9 + hr[1]) / 1e6

const runTest = async type => {
  const rimraf = cases[type]
  if (!rimraf) throw new Error('unknown rimraf type: ' + type)

  const opt = {
    start: START,
    end: END,
    depth: DEPTH,
  }
  console.error(`\nrunning test for ${type}, iterations=${N} %j...`, opt)

  // first, create all fixtures
  const syncPaths = []
  const asyncPaths = []
  const paraPaths = []
  process.stderr.write('creating fixtures...')
  for (let i = 0; i < N; i++) {
    const [syncPath, asyncPath, paraPath] = await Promise.all([
      create({ name: `${type}/sync/${i}`, ...opt }),
      create({ name: `${type}/async/${i}`, ...opt }),
      create({ name: `${type}/para/${i}`, ...opt }),
    ])
    syncPaths.push(syncPath)
    asyncPaths.push(asyncPath)
    paraPaths.push(paraPath)
    process.stderr.write('.')
  }
  console.error('done!')

  const syncTimes = []
  const syncFails = []
  process.stderr.write('running sync tests...')
  const startSync = process.hrtime()
  for (const path of syncPaths) {
    const start = process.hrtime()
    try {
      rimraf.sync(path)
      syncTimes.push(hrToMS(process.hrtime(start)))
    } catch (er) {
      syncFails.push(er)
    }
    process.stderr.write('.')
  }
  const syncTotal = hrToMS(process.hrtime(startSync))
  console.error('done! (%j ms, %j failed)', syncTotal, syncFails.length)

  const asyncTimes = []
  const asyncFails = []
  process.stderr.write('running async tests...')
  const startAsync = process.hrtime()
  for (const path of asyncPaths) {
    const start = process.hrtime()
    await rimraf(path)
      .then(
        () => asyncTimes.push(hrToMS(process.hrtime(start))),
        er => asyncFails.push(er),
      )
      .then(() => process.stderr.write('.'))
  }
  const asyncTotal = hrToMS(process.hrtime(startAsync))
  console.error('done! (%j ms, %j failed)', asyncTotal, asyncFails.length)

  const paraTimes = []
  const paraFails = []
  process.stderr.write('running parallel tests...')
  const startPara = process.hrtime()
  const paraRuns = []
  for (const path of paraPaths) {
    const start = process.hrtime()
    paraRuns.push(
      rimraf(path)
        .then(
          () => paraTimes.push(hrToMS(process.hrtime(start))),
          er => paraFails.push(er),
        )
        .then(() => process.stderr.write('.')),
    )
  }
  await Promise.all(paraRuns)
  const paraTotal = hrToMS(process.hrtime(startPara))
  console.error('done! (%j ms, %j failed)', paraTotal, paraFails.length)

  // wait a tick to let stderr to clear
  return Promise.resolve().then(() => ({
    syncTimes,
    syncFails,
    asyncTimes,
    asyncFails,
    paraTimes,
    paraFails,
  }))
}

module.exports = runTest
