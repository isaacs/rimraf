import rimrafs, { names as rimrafNames } from './rimrafs.js'
import runTest, { names as runTestNames } from './run-test.js'
import parse from './parse-results.js'
import { sync as rimrafSync } from '../dist/esm/index.js'
import { parseArgs } from 'util'
import assert from 'assert'
import { readFileSync, writeFileSync } from 'fs'

const parseOptions = () => {
  const { values } = parseArgs({
    options: {
      cases: {
        type: 'string',
        short: 'c',
        multiple: true,
      },
      'omit-cases': {
        type: 'string',
        short: 'o',
        multiple: true,
      },
      'start-char': {
        type: 'string',
        default: 'a',
      },
      'end-char': {
        type: 'string',
        default: 'f',
      },
      depth: {
        type: 'string',
        default: '5',
      },
      iterations: {
        type: 'string',
        default: '7',
      },
      compare: {
        type: 'string',
      },
      save: {
        type: 'boolean',
      },
    },
  })

  if (values.compare) {
    const { results, options } = JSON.parse(
      readFileSync(values.compare, 'utf8'),
    )
    return {
      ...options,
      save: false,
      compare: results,
    }
  }

  const allNames = new Set([...rimrafNames, ...runTestNames])
  const partition = (name, defaults = [new Set(), new Set()]) => {
    const options = values[name] ?? []
    assert(
      options.every(c => allNames.has(c)),
      new TypeError(`invalid ${name}`, {
        cause: {
          found: options,
          wanted: [...allNames],
        },
      }),
    )
    const found = options.reduce(
      (acc, k) => {
        acc[rimrafNames.has(k) ? 0 : 1].add(k)
        return acc
      },
      [new Set(), new Set()],
    )
    return [
      found[0].size ? found[0] : defaults[0],
      found[1].size ? found[1] : defaults[1],
    ]
  }

  const cases = partition('cases', [rimrafNames, runTestNames])
  for (const [i, omitCase] of Object.entries(partition('omit-cases'))) {
    for (const o of omitCase) {
      cases[i].delete(o)
    }
  }

  return {
    rimraf: [...cases[0]],
    runTest: [...cases[1]],
    start: values['start-char'],
    end: values['end-char'],
    depth: +values.depth,
    iterations: +values.iterations,
    save: values.save,
    compare: null,
  }
}

const main = async () => {
  // cleanup first.  since the windows impl works on all platforms,
  // use that.  it's only relevant if the folder exists anyway.
  rimrafSync(import.meta.dirname + '/fixtures')
  const data = {}
  const { save, compare, ...options } = parseOptions()
  for (const [name, rimraf] of Object.entries(rimrafs)) {
    if (options.rimraf.includes(name)) {
      data[name] = await runTest(name, rimraf, options)
    }
  }
  rimrafSync(import.meta.dirname + '/fixtures')
  const { results, entries } = parse(data, compare)
  if (save) {
    const f = `benchmark-${Date.now()}.json`
    writeFileSync(f, JSON.stringify({ options, results }, 0, 2))
    console.log(`results saved to ${f}`)
  } else {
    console.log(JSON.stringify(results, null, 2))
  }
  console.table(
    entries
      .sort(([, { mean: a }], [, { mean: b }]) => a - b)
      .reduce((set, [key, val]) => {
        set[key] = val
        return set
      }, {}),
  )
}

main()
