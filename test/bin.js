const t = require('tap')
const { readdirSync } = require('fs')

t.test('basic arg parsing stuff', t => {
  const LOGS = []
  const ERRS = []
  const { log: consoleLog, error: consoleError } = console
  t.teardown(() => {
    console.log = consoleLog
    console.error = consoleError
  })
  console.log = (...msg) => LOGS.push(msg)
  console.error = (...msg) => ERRS.push(msg)

  const CALLS = []
  const rimraf = Object.assign(
    async (path, opt) => CALLS.push(['rimraf', path, opt]),
    {
      native: async (path, opt) => CALLS.push(['native', path, opt]),
      manual: async (path, opt) => CALLS.push(['manual', path, opt]),
      posix: async (path, opt) => CALLS.push(['posix', path, opt]),
      windows: async (path, opt) => CALLS.push(['windows', path, opt]),
      moveRemove: async (path, opt) => CALLS.push(['move-remove', path, opt]),
    }
  )

  const bin = t.mock('../dist/cjs/src/bin.js', {
    '../dist/cjs/src/index.js': {
      rimraf,
      ...rimraf,
    },
  }).default

  t.afterEach(() => {
    LOGS.length = 0
    ERRS.length = 0
    CALLS.length = 0
  })

  t.test('helpful output', t => {
    const cases = [['-h'], ['--help'], ['a', 'b', '--help', 'c']]
    for (const c of cases) {
      t.test(c.join(' '), async t => {
        t.equal(await bin(...c), 0)
        t.same(LOGS, [[bin.help]])
        t.same(ERRS, [])
        t.same(CALLS, [])
      })
    }
    t.end()
  })

  t.test('no paths', async t => {
    t.equal(await bin(), 1)
    t.same(LOGS, [])
    t.same(ERRS, [
      ['rimraf: must provide a path to remove'],
      ['run `rimraf --help` for usage information'],
    ])
  })

  t.test('unnecessary -rf', async t => {
    t.equal(await bin('-rf', 'foo'), 0)
    t.equal(await bin('-fr', 'foo'), 0)
    t.equal(await bin('foo', '-rf'), 0)
    t.equal(await bin('foo', '-fr'), 0)
    t.same(LOGS, [])
    t.same(ERRS, [])
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
    t.same(LOGS, [])
    t.same(ERRS, [])
    const { log } = console
    t.teardown(() => {
      console.log = log
    })
    const logs = []
    console.log = s => logs.push(s)
    for (const c of CALLS) {
      t.equal(c[0], 'rimraf')
      t.same(c[1], ['foo'])
      t.type(c[2].filter, 'function')
      t.equal(c[2].filter('x'), true)
      t.same(logs, ['x'])
      logs.length = 0
    }
  })

  t.test('silent', async t => {
    t.equal(await bin('-V', 'foo'), 0)
    t.equal(await bin('--no-verbose', 'foo'), 0)
    t.equal(await bin('-V', '-v', '--no-verbose', 'foo'), 0)
    t.same(LOGS, [])
    t.same(ERRS, [])
    const { log } = console
    t.teardown(() => {
      console.log = log
    })
    const logs = []
    console.log = s => logs.push(s)
    for (const c of CALLS) {
      t.equal(c[0], 'rimraf')
      t.same(c[1], ['foo'])
      t.type(c[2].filter, 'undefined')
      t.same(logs, [])
    }
  })

  t.test('glob true', async t => {
    t.equal(await bin('-g', 'foo'), 0)
    t.equal(await bin('--glob', 'foo'), 0)
    t.equal(await bin('-G', '-g', 'foo'), 0)
    t.equal(await bin('-g', '-G', 'foo'), 0)
    t.equal(await bin('-G', 'foo'), 0)
    t.equal(await bin('--no-glob', 'foo'), 0)
    t.same(LOGS, [])
    t.same(ERRS, [])
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
    t.same(LOGS, [])
    t.same(ERRS, [])
    t.same(CALLS, [['rimraf', ['-h'], {}]])
  })

  t.test('no preserve root', async t => {
    t.equal(await bin('--no-preserve-root', 'foo'), 0)
    t.same(LOGS, [])
    t.same(ERRS, [])
    t.same(CALLS, [['rimraf', ['foo'], { preserveRoot: false }]])
  })
  t.test('yes preserve root', async t => {
    t.equal(await bin('--preserve-root', 'foo'), 0)
    t.same(LOGS, [])
    t.same(ERRS, [])
    t.same(CALLS, [['rimraf', ['foo'], { preserveRoot: true }]])
  })
  t.test('yes preserve root, remove root', async t => {
    t.equal(await bin('/'), 1)
    t.same(LOGS, [])
    t.same(ERRS, [
      [`rimraf: it is dangerous to operate recursively on '/'`],
      ['use --no-preserve-root to override this failsafe'],
    ])
    t.same(CALLS, [])
  })
  t.test('no preserve root, remove root', async t => {
    t.equal(await bin('/', '--no-preserve-root'), 0)
    t.same(LOGS, [])
    t.same(ERRS, [])
    t.same(CALLS, [['rimraf', ['/'], { preserveRoot: false }]])
  })

  t.test('--tmp=<path>', async t => {
    t.equal(await bin('--tmp=some-path', 'foo'), 0)
    t.same(LOGS, [])
    t.same(ERRS, [])
    t.same(CALLS, [['rimraf', ['foo'], { tmp: 'some-path' }]])
  })

  t.test('--tmp=<path>', async t => {
    t.equal(await bin('--backoff=1.3', 'foo'), 0)
    t.same(LOGS, [])
    t.same(ERRS, [])
    t.same(CALLS, [['rimraf', ['foo'], { backoff: 1.3 }]])
  })

  t.test('--max-retries=n', async t => {
    t.equal(await bin('--max-retries=100', 'foo'), 0)
    t.same(LOGS, [])
    t.same(ERRS, [])
    t.same(CALLS, [['rimraf', ['foo'], { maxRetries: 100 }]])
  })

  t.test('--retry-delay=n', async t => {
    t.equal(await bin('--retry-delay=100', 'foo'), 0)
    t.same(LOGS, [])
    t.same(ERRS, [])
    t.same(CALLS, [['rimraf', ['foo'], { retryDelay: 100 }]])
  })

  t.test('--uknown-option', async t => {
    t.equal(await bin('--unknown-option=100', 'foo'), 1)
    t.same(LOGS, [])
    t.same(ERRS, [
      ['unknown option: --unknown-option=100'],
      ['run `rimraf --help` for usage information'],
    ])
    t.same(CALLS, [])
  })

  t.test('--impl=asdf', async t => {
    t.equal(await bin('--impl=asdf', 'foo'), 1)
    t.same(LOGS, [])
    t.same(ERRS, [
      ['unknown implementation: asdf'],
      ['run `rimraf --help` for usage information'],
    ])
    t.same(CALLS, [])
  })

  t.test('native cannot do filters', async t => {
    t.equal(await bin('--impl=native', '-v', 'foo'), 1)
    t.same(ERRS, [
      ['native implementation does not support -v or -i'],
      ['run `rimraf --help` for usage information'],
    ])
    ERRS.length = 0
    t.equal(await bin('--impl=native', '-i', 'foo'), 1)
    t.same(ERRS, [
      ['native implementation does not support -v or -i'],
      ['run `rimraf --help` for usage information'],
    ])
    ERRS.length = 0
    t.same(CALLS, [])
    t.same(LOGS, [])
    // ok to turn it on and back off though
    t.equal(await bin('--impl=native', '-i', '-I', 'foo'), 0)
    t.same(CALLS, [['native', ['foo'], {}]])
  })

  const impls = [
    'rimraf',
    'native',
    'manual',
    'posix',
    'windows',
    'move-remove',
  ]
  for (const impl of impls) {
    t.test(`--impl=${impl}`, async t => {
      t.equal(await bin('foo', `--impl=${impl}`), 0)
      t.same(LOGS, [])
      t.same(ERRS, [])
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

  const bin = require.resolve('../dist/cjs/src/bin.js')
  const { spawnSync } = require('child_process')
  const res = spawnSync(process.execPath, [bin, path])
  const { statSync } = require('fs')
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

  const bin = require.resolve('../dist/cjs/src/bin.js')
  const { spawnSync } = require('child_process')
  const res = spawnSync(process.execPath, [bin, path], {
    env: {
      ...process.env,
      __RIMRAF_TESTING_BIN_FAIL__: '1',
    },
  })
  const { statSync } = require('fs')
  t.equal(statSync(path).isDirectory(), true)
  t.equal(res.status, 1)
  t.match(res.stderr.toString(), /^Error: simulated rimraf failure/)
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

  // t.jobs = scripts.length * verboseOpt.length

  const { spawn } = require('child_process')
  const bin = require.resolve('../dist/cjs/src/bin.js')
  const node = process.execPath

  const leftovers = d => {
    try {
      readdirSync(d)
      return true
    } catch (_) {
      return false
    }
  }

  for (const verbose of verboseOpt) {
    t.test(verbose, async t => {
      for (const s of scripts) {
        const script = s.slice()
        t.test(script.join(', '), async t => {
          const d = t.testdir(fixture)
          const args = [bin, '-i', verbose, d]
          const child = spawn(node, args, {
            stdio: 'pipe',
          })
          const out = []
          const err = []
          const timer = setTimeout(() => {
            t.fail('timed out')
            child.kill('SIGKILL')
          }, 10000)
          child.stdout.setEncoding('utf8')
          child.stderr.setEncoding('utf8')
          let last = ''
          child.stdout.on('data', async c => {
            // await new Promise(r => setTimeout(r, 50))
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
          child.stderr.on('data', c => {
            err.push(c)
          })
          return new Promise(res => {
            child.on('close', (code, signal) => {
              clearTimeout(timer)
              t.same(err, [], 'should not see any stderr')
              t.equal(code, 0, 'code')
              t.equal(signal, null, 'signal')
              t.matchSnapshot(leftovers(d), 'had any leftover')
              res()
            })
          })
        })
      }
      t.end()
    })
  }
  t.end()
})
