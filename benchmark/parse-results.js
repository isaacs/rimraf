const sum = list => list.reduce((a, b) => a + b)
const mean = list => sum(list) / list.length
const median = list => list.sort()[Math.floor(list.length / 2)]
const max = list => list.sort()[list.length - 1]
const min = list => list.sort()[0]
const sqrt = n => Math.pow(n, 0.5)
const variance = list => {
  const m = mean(list)
  return mean(list.map(n => Math.pow(n - m, 2)))
}
const stddev = list => {
  const v = variance(list)
  if (isNaN(v)) {
    throw new Error('wat?', { cause: { list, v } })
  }
  return sqrt(variance(list))
}
const comp = (v1, v2) => {
  if (v1 === undefined) {
    return {}
  }
  return {
    'old mean': v1.mean,
    '% +/-': round(((v2.mean - v1.mean) / v1.mean) * 100),
  }
}

const round = n => Math.round(n * 1e3) / 1e3

const nums = list => ({
  mean: round(mean(list)),
  median: round(median(list)),
  stddev: round(stddev(list)),
  max: round(max(list)),
  min: round(min(list)),
})

const printEr = er => `${er.code ? er.code + ': ' : ''}${er.message}`

const parseResults = (data, compare) => {
  const results = {}
  const table = {}

  for (const [rimrafName, rimrafData] of Object.entries(data)) {
    results[rimrafName] = {}
    for (const [runTestName, { times, fails }] of Object.entries(rimrafData)) {
      const result = nums(times)
      const failures = fails.map(printEr)
      results[rimrafName][runTestName] = { ...result, times, failures }
      table[`${rimrafName} ${runTestName}`] = {
        ...result,
        ...comp(compare?.[rimrafName]?.[runTestName], result),
        ...(failures.length ? { failures: failures.join('\n') } : {}),
      }
    }
  }

  return {
    results,
    entries: Object.entries(table),
  }
}

export default parseResults
