import { spawn, spawnSync } from 'child_process'
import { readdirSync, statSync } from 'fs'
import t from 'tap'
import { RimrafOptions } from '../src/index.js'
import { resolve } from 'path'
import { loadPackageJson } from 'package-json-from-dist'

const binModule = resolve(import.meta.dirname, '../dist/esm/bin.mjs')
const { version } = loadPackageJson(import.meta.url, '../package.json')

const mockBin = async (
  argv: string[],
  mocks: Record<string, any>,
): Promise<number> =>
  new Promise(res => {
    t.intercept(process, 'argv', { value: [, , ...argv] })
    t.intercept(process, 'exit', { value: (code: number) => res(code) })
    t.mockImport('../src/bin.mjs', mocks)
  })

t.test('basic arg parsing stuff', async t => {
  const CALLS: any[] = []
  const impls = new Map([
    ['rimraf', 'rimraf'],
    ['native', 'native'],
    ['manual', 'manual'],
    ['posix', 'posix'],
    ['windows', 'windows'],
    ['moveRemove', 'move-remove'],
  ])
  const { rimraf, ...mocks } = [...impls.entries()].reduce<
    Record<string, (path: string, opt: RimrafOptions) => Promise<number>>
  >((acc, [k, v]) => {
    acc[k] = async (path, opt) => CALLS.push([v, path, opt])
    return acc
  }, {})

  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args

  const bin = (...argv: string[]) =>
    mockBin(argv, {
      '../src/index.js': {
        rimraf: Object.assign(rimraf!, mocks),
        ...mocks,
      },
    })

  t.afterEach(() => {
    CALLS.length = 0
  })

  t.test('binary version', t => {
    const cases = [['--version'], ['a', 'b', '--version', 'c']]
    for (const c of cases) {
      t.test(c.join(' '), async t => {
        t.equal(await bin(...c), 0)
        t.strictSame(logs(), [[version]])
        t.strictSame(errs(), [])
        t.same(CALLS, [])
      })
    }
    t.end()
  })

  t.test('helpful output', t => {
    const cases = [['-h'], ['--help'], ['a', 'b', '--help', 'c']]
    for (const c of cases) {
      t.test(c.join(' '), async t => {
        t.equal(await bin(...c), 0)
        const l = logs()
        t.equal(l.length, 1)
        t.match(l[0]![0], `rimraf version ${version}`)
        t.strictSame(errs(), [])
        t.same(CALLS, [])
      })
    }
    t.end()
  })

  t.test('no paths', async t => {
    t.equal(await bin(), 1)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [
      ['rimraf: must provide a path to remove'],
      ['run `rimraf --help` for usage information'],
    ])
  })

  t.test('unnecessary -rf', async t => {
    t.equal(await bin('-rf', 'foo'), 0)
    t.equal(await bin('-fr', 'foo'), 0)
    t.equal(await bin('foo', '-rf'), 0)
    t.equal(await bin('foo', '-fr'), 0)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
    t.same(CALLS, [
      ['rimraf', ['foo'], {}],
      ['rimraf', ['foo'], {}],
      ['rimraf', ['foo'], {}],
      ['rimraf', ['foo'], {}],
    ])
  })

  t.test('verbose', async t => {
    t.equal(await bin('-v', 'foo'), 0)
    t.equal(await bin('--verbose', 'foo'), 0)
    t.equal(await bin('-v', '-V', '--verbose', 'foo'), 0)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
    for (const c of CALLS) {
      t.equal(c[0], 'rimraf')
      t.same(c[1], ['foo'])
      t.type(c[2].filter, 'function')
      t.equal(c[2].filter('x'), true)
      t.strictSame(logs(), [['x']])
    }
  })

  t.test('silent', async t => {
    t.equal(await bin('-V', 'foo'), 0)
    t.equal(await bin('--no-verbose', 'foo'), 0)
    t.equal(await bin('-V', '-v', '--no-verbose', 'foo'), 0)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
    for (const c of CALLS) {
      t.equal(c[0], 'rimraf')
      t.same(c[1], ['foo'])
      t.type(c[2].filter, 'undefined')
      t.strictSame(logs(), [])
    }
  })

  t.test('glob true', async t => {
    t.equal(await bin('-g', 'foo'), 0)
    t.equal(await bin('--glob', 'foo'), 0)
    t.equal(await bin('-G', '-g', 'foo'), 0)
    t.equal(await bin('-g', '-G', 'foo'), 0)
    t.equal(await bin('-G', 'foo'), 0)
    t.equal(await bin('--no-glob', 'foo'), 0)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
    t.same(CALLS, [
      ['rimraf', ['foo'], { glob: true }],
      ['rimraf', ['foo'], { glob: true }],
      ['rimraf', ['foo'], { glob: true }],
      ['rimraf', ['foo'], { glob: false }],
      ['rimraf', ['foo'], { glob: false }],
      ['rimraf', ['foo'], { glob: false }],
    ])
  })

  t.test('dashdash', async t => {
    t.equal(await bin('--', '-h'), 0)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
    t.same(CALLS, [['rimraf', ['-h'], {}]])
  })

  t.test('no preserve root', async t => {
    t.equal(await bin('--no-preserve-root', 'foo'), 0)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
    t.same(CALLS, [['rimraf', ['foo'], { preserveRoot: false }]])
  })
  t.test('yes preserve root', async t => {
    t.equal(await bin('--preserve-root', 'foo'), 0)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
    t.same(CALLS, [['rimraf', ['foo'], { preserveRoot: true }]])
  })
  t.test('yes preserve root, remove root', async t => {
    t.equal(await bin('/'), 1)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [
      [`rimraf: it is dangerous to operate recursively on '/'`],
      ['use --no-preserve-root to override this failsafe'],
    ])
    t.same(CALLS, [])
  })
  t.test('no preserve root, remove root', async t => {
    t.equal(await bin('/', '--no-preserve-root'), 0)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
    t.same(CALLS, [['rimraf', ['/'], { preserveRoot: false }]])
  })

  t.test('--tmp=<path>', async t => {
    t.equal(await bin('--tmp=some-path', 'foo'), 0)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
    t.same(CALLS, [['rimraf', ['foo'], { tmp: 'some-path' }]])
  })

  t.test('--tmp=<path>', async t => {
    t.equal(await bin('--backoff=1.3', 'foo'), 0)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
    t.same(CALLS, [['rimraf', ['foo'], { backoff: 1.3 }]])
  })

  t.test('--max-retries=n', async t => {
    t.equal(await bin('--max-retries=100', 'foo'), 0)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
    t.same(CALLS, [['rimraf', ['foo'], { maxRetries: 100 }]])
  })

  t.test('--retry-delay=n', async t => {
    t.equal(await bin('--retry-delay=100', 'foo'), 0)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
    t.same(CALLS, [['rimraf', ['foo'], { retryDelay: 100 }]])
  })

  t.test('--uknown-option', async t => {
    t.equal(await bin('--unknown-option=100', 'foo'), 1)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [
      ['unknown option: --unknown-option=100'],
      ['run `rimraf --help` for usage information'],
    ])
    t.same(CALLS, [])
  })

  t.test('--impl=asdf', async t => {
    t.equal(await bin('--impl=asdf', 'foo'), 1)
    t.strictSame(logs(), [])
    t.strictSame(errs(), [
      ['unknown implementation: asdf'],
      ['run `rimraf --help` for usage information'],
    ])
    t.same(CALLS, [])
  })

  t.test('native cannot do filters', async t => {
    t.equal(await bin('--impl=native', '-v', 'foo'), 1)
    t.strictSame(errs(), [
      ['native implementation does not support -v or -i'],
      ['run `rimraf --help` for usage information'],
    ])
    t.strictSame(errs(), [])
    t.equal(await bin('--impl=native', '-i', 'foo'), 1)
    t.strictSame(errs(), [
      ['native implementation does not support -v or -i'],
      ['run `rimraf --help` for usage information'],
    ])
    t.same(CALLS, [])
    t.strictSame(logs(), [])
    // ok to turn it on and back off though
    t.equal(await bin('--impl=native', '-i', '-I', 'foo'), 0)
    t.same(CALLS, [['native', ['foo'], {}]])
  })

  for (const impl of impls.values()) {
    t.test(`--impl=${impl}`, async t => {
      t.equal(await bin('foo', `--impl=${impl}`), 0)
      t.strictSame(logs(), [])
      t.strictSame(errs(), [])
      t.same(CALLS, [[impl, ['foo'], {}]])
    })
  }

  t.end()
})

t.test('actually delete something with it', async t => {
  const path = t.testdir({
    a: {
      b: {
        c: '1',
      },
    },
  })

  const res = spawnSync(process.execPath, [binModule, path], {
    encoding: 'utf8',
  })
  t.throws(() => statSync(path))
  t.equal(res.status, 0)
})

t.test('print failure when impl throws', async t => {
  const path = t.testdir({
    a: {
      b: {
        c: '1',
      },
    },
  })
  const err = new Error('simulated rimraf failure')
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const code = await mockBin([path], {
    '../src/index.js': {
      rimraf: async () => {
        throw err
      },
    },
  })
  t.strictSame(logs(), [])
  t.strictSame(errs(), [[err]])
  t.equal(code, 1)
  t.equal(statSync(path).isDirectory(), true)
})

t.test('interactive deletes', t => {
  const scripts = [
    ['a'],
    ['y', 'YOLO', 'no', 'quit'],
    ['hehaha', 'yes i think so', '', 'A'],
    ['no', 'n', 'N', 'N', 'Q'],
  ]
  const fixture = {
    a: { b: '', c: '', d: '' },
    b: { c: '', d: '', e: '' },
    c: { d: '', e: '', f: '' },
  }
  const verboseOpt = ['-v', '-V']

  const node = process.execPath

  const leftovers = (d: string) => {
    try {
      readdirSync(d)
      return true
    } catch {
      return false
    }
  }

  for (const verbose of verboseOpt) {
    t.test(verbose, async t => {
      for (const s of scripts) {
        const script = s.slice()
        t.test(script.join(', '), async t => {
          const d = t.testdir(fixture)
          const args = [binModule, '-i', verbose, d]
          const child = spawn(node, args, {
            stdio: 'pipe',
          })
          const out: string[] = []
          const err: string[] = []
          const timer = setTimeout(() => {
            t.fail('timed out')
            child.kill('SIGKILL')
          }, 10000)
          child.stdout.setEncoding('utf8')
          child.stderr.setEncoding('utf8')
          let last = ''
          child.stdout.on('data', async (c: string) => {
            out.push(c.trim())
            const s = script.shift()
            if (s !== undefined) {
              last === s
              out.push(s.trim())
              child.stdin.write(s + '\n')
            } else {
              // keep writing whatever the last option was
              child.stdin.write(last + '\n')
            }
          })
          child.stderr.on('data', (c: string) => {
            err.push(c)
          })
          return new Promise<void>(res => {
            child.on(
              'close',
              (code: number | null, signal: NodeJS.Signals | null) => {
                clearTimeout(timer)
                t.same(err, [], 'should not see any stderr')
                t.equal(code, 0, 'code')
                t.equal(signal, null, 'signal')
                t.matchSnapshot(leftovers(d), 'had any leftover')
                res()
              },
            )
          })
        })
      }
      t.end()
    })
  }
  t.end()
})
