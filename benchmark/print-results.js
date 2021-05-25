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
    console.error({list, v})
    throw new Error('wat?')
  }
  return sqrt(variance(list))
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
const failures = list => list.length === 0 ? {}
  : { failures: list.map(er => printEr(er)).join('\n') }

const table = results => {
  const table = {}
  for (const [type, data] of Object.entries(results)) {
    table[`${type} sync`] = {
      ...nums(data.syncTimes),
      ...failures(data.syncFails),
    }
    table[`${type} async`] = {
      ...nums(data.asyncTimes),
      ...failures(data.asyncFails),
    }
    table[`${type} parallel`] = {
      ...nums(data.paraTimes),
      ...failures(data.paraFails),
    }
  }
  // sort by mean time
  return Object.entries(table)
    .sort(([, {mean:a}], [, {mean:b}]) => a - b)
    .reduce((set, [key, val]) => {
      set[key] = val
      return set
    }, {})
}

const print = results => {
  console.log(JSON.stringify(results, 0, 2))
  console.log('Results sorted by fastest mean value')
  console.table(table(results))
}

module.exports = print
