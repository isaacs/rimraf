import create from './create-fixture.js'

const TESTS = {
  sync: 'sync',
  async: 'async',
  parallel: 'parallel',
}

const hrToMS = hr => Math.round(hr[0] * 1e9 + hr[1]) / 1e6

const runTest = async (
  type,
  rimraf,
  { runTest: cases, start, end, depth, iterations },
) => {
  console.error(`\nrunning test for ${type}, %j`, {
    start,
    end,
    depth,
    iterations,
  })

  // first, create all fixtures
  const syncPaths = []
  const asyncPaths = []
  const paraPaths = []
  process.stderr.write('creating fixtures')
  for (let i = 0; i < iterations; i++) {
    const [syncPath, asyncPath, paraPath] = await Promise.all([
      cases.includes(TESTS.sync) ?
        create({ name: `${type}/sync/${i}`, start, end, depth })
      : null,
      cases.includes(TESTS.async) ?
        create({ name: `${type}/async/${i}`, start, end, depth })
      : null,
      cases.includes(TESTS.parallel) ?
        create({ name: `${type}/para/${i}`, start, end, depth })
      : null,
    ])
    syncPath && syncPaths.push(syncPath)
    asyncPath && asyncPaths.push(asyncPath)
    paraPath && paraPaths.push(paraPath)
    process.stderr.write('.')
  }
  process.stderr.write('done!\n')

  const syncTimes = []
  const syncFails = []
  if (syncPaths.length) {
    process.stderr.write('running sync tests')
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
  }

  const asyncTimes = []
  const asyncFails = []
  if (asyncPaths.length) {
    process.stderr.write('running async tests')
    const startAsync = process.hrtime()
    for (const path of asyncPaths) {
      const start = process.hrtime()
      await rimraf(path).then(
        () => asyncTimes.push(hrToMS(process.hrtime(start))),
        er => asyncFails.push(er),
      )
      process.stderr.write('.')
    }
    const asyncTotal = hrToMS(process.hrtime(startAsync))
    console.error('done! (%j ms, %j failed)', asyncTotal, asyncFails.length)
  }

  const paraTimes = []
  const paraFails = []
  if (paraPaths.length) {
    process.stderr.write('running parallel tests')
    const startPara = process.hrtime()
    const paraRuns = []
    for (const path of paraPaths) {
      process.stderr.write('.')
      const start = process.hrtime()
      paraRuns.push(
        rimraf(path).then(
          () => paraTimes.push(hrToMS(process.hrtime(start))),
          er => paraFails.push(er),
        ),
      )
    }
    await Promise.all(paraRuns)
    const paraTotal = hrToMS(process.hrtime(startPara))
    console.error('done! (%j ms, %j failed)', paraTotal, paraFails.length)
  }
  process.stderr.write('\n')

  // wait a tick to let stderr to clear
  return Promise.resolve().then(() => ({
    ...(syncPaths.length ?
      {
        sync: {
          times: syncTimes,
          fails: syncFails,
        },
      }
    : {}),
    ...(asyncPaths.length ?
      {
        async: {
          times: asyncTimes,
          fails: asyncFails,
        },
      }
    : {}),
    ...(paraPaths.length ?
      {
        parallel: {
          times: paraTimes,
          fails: paraFails,
        },
      }
    : {}),
  }))
}

export const names = new Set(Object.values(TESTS))
export default runTest
