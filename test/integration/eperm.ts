import t, { Test } from 'tap'
import { mkdirSync, readdirSync, writeFileSync } from 'fs'
import { sep, join } from 'path'
import { globSync } from 'glob'
import { windows, windowsSync } from '../../src/index.js'
import { randomBytes } from 'crypto'
import assert from 'assert'

const arrSame = (arr1: string[], arr2: string[]) => {
  const s = (a: string[]) => [...a].sort().join(',')
  return s(arr1) === s(arr2)
}

const setup = (
  t: Test,
  {
    iterations,
    depth,
    files: fileCount,
    fileKb,
  }: {
    iterations: number
    depth: number
    files: number
    fileKb: number
  },
) => {
  const dir = t.testdir()

  const letters = (length: number) =>
    Array.from({ length }).map((_, i) => (10 + i).toString(36))
  const files = letters(fileCount).map(f => `file_${f}`)
  const dirs = join(...letters(depth))
    .split(sep)
    .reduce<string[]>((acc, d) => acc.concat(join(acc.at(-1) ?? '', d)), [])
  const entries = dirs
    .flatMap(d => [d, ...files.map(f => join(d, f))])
    .map(d => join(dir, d))

  let iteration = 0
  return function* () {
    while (iteration !== iterations) {
      // use custom error to throw instead of using tap assertions to cut down
      // on output when running many iterations
      class RunError extends Error {
        constructor(message: string, c?: Record<string, unknown>) {
          super(message, {
            cause: {
              testName: t.name,
              iteration,
              ...c,
            },
          })
        }
      }

      const actual = readdirSync(dir)
      assert(
        !actual.length,
        new RunError(`dir is not empty`, {
          found: actual,
        }),
      )

      mkdirSync(join(dir, dirs.at(-1)!), { recursive: true })
      for (const d of dirs) {
        for (const f of files) {
          writeFileSync(join(dir, d, f), randomBytes(1024 * fileKb))
        }
      }

      // randomize results from glob so that when running Promise.all(rimraf)
      // on the result it will potentially delete parent directories before
      // child directories and their files. This seems to make EPERM errors
      // more likely on Windows.
      const matches = globSync('**/*', { cwd: dir })
        .sort(() => 0.5 - Math.random())
        .map(m => join(dir, m))

      assert(
        arrSame(matches, entries),
        new RunError(`glob result does not match expected`, {
          found: matches,
          wanted: entries,
        }),
      )

      iteration += 1

      yield [matches, RunError] as const
    }

    return {
      contents: readdirSync(dir),
      iteration,
      iterations,
    }
  }
}

// Copied from sindresorhus/del since it was reported in
// https://github.com/isaacs/rimraf/pull/314 that this test would throw EPERM
// errors consistently in Windows CI environments.
// https://github.com/sindresorhus/del/blob/chore/update-deps/test.js#L116
t.test('windows does not throw EPERM', t => {
  const options =
    process.env.CI ?
      {
        iterations: 1000,
        depth: 15,
        files: 7,
        fileKb: 100,
      }
    : {
        iterations: 200,
        depth: 8,
        files: 3,
        fileKb: 10,
      }

  t.test('sync', t => {
    let i
    const r = setup(t, options)()
    while ((i = r.next())) {
      if (i.done) {
        i = i.value
        break
      }

      const [matches, RunError] = i.value
      const result = matches
        .map(path => {
          try {
            return {
              path,
              deleted: windowsSync(path),
            }
          } catch (error) {
            throw new RunError('rimraf error', { error, path })
          }
        })
        .filter(({ deleted }) => deleted !== true)
      assert(
        !result.length,
        new RunError(`some entries were not deleted`, {
          found: result,
        }),
      )
    }

    t.strictSame(i.contents, [])
    t.equal(i.iteration, i.iterations, `ran all ${i.iteration} iterations`)
    t.end()
  })

  t.test('async', async t => {
    let i
    const r = setup(t, options)()
    while ((i = r.next())) {
      if (i.done) {
        i = i.value
        break
      }

      const [matches, RunError] = i.value
      const result = (
        await Promise.all(
          matches.map(async path => {
            try {
              return {
                path,
                deleted: await windows(path),
              }
            } catch (error) {
              throw new RunError('rimraf error', { error, path })
            }
          }),
        )
      ).filter(({ deleted }) => deleted !== true)
      assert(
        !result.length,
        new RunError(`some entries were not deleted`, {
          found: result,
        }),
      )
    }

    t.strictSame(i.contents, [])
    t.equal(i.iteration, i.iterations, `ran all ${i.iteration} iterations`)
  })

  t.end()
})
