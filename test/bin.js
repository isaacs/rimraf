var bin = require.resolve('../bin.js')
var t = require('tap')
var mkdirp = require('mkdirp')
var fs = require('fs')
var spawn = require('child_process').spawn
var node = process.execPath
var rimraf = require('../')

t.test('setup', function (t) {
  rimraf.sync(__dirname + '/bintest')
  mkdirp.sync(__dirname + '/bintest')
  process.chdir(__dirname + '/bintest')
  mkdirp.sync('a/b/c')
  mkdirp.sync('x/y/z')
  fs.writeFileSync('a/1.txt', '\n')
  fs.writeFileSync('a/2.txt', '\n')
  fs.writeFileSync('a/3.txt', '\n')
  fs.writeFileSync('a/*.txt', '\n')
  fs.writeFileSync('a/b/1.txt', '\n')
  fs.writeFileSync('a/b/2.txt', '\n')
  fs.writeFileSync('a/b/3.txt', '\n')
  fs.writeFileSync('a/b/*.txt', '\n')
  fs.writeFileSync('a/b/c/1.txt', '\n')
  fs.writeFileSync('a/b/c/2.txt', '\n')
  fs.writeFileSync('a/b/c/3.txt', '\n')
  fs.writeFileSync('a/b/c/*.txt', '\n')
  fs.writeFileSync('x/1.txt', '\n')
  fs.writeFileSync('x/2.txt', '\n')
  fs.writeFileSync('x/3.txt', '\n')
  fs.writeFileSync('x/*.txt', '\n')
  fs.writeFileSync('x/y/1.txt', '\n')
  fs.writeFileSync('x/y/2.txt', '\n')
  fs.writeFileSync('x/y/3.txt', '\n')
  fs.writeFileSync('x/y/*.txt', '\n')
  fs.writeFileSync('x/y/z/1.txt', '\n')
  fs.writeFileSync('x/y/z/2.txt', '\n')
  fs.writeFileSync('x/y/z/3.txt', '\n')
  fs.writeFileSync('x/y/z/*.txt', '\n')
  t.end()
})

t.test('help', function (t) {
  var helps = ['-help', '-h', '--help', '--?']
  t.plan(helps.length)
  helps.forEach(function (h) {
    t.test(h, test.bind(null, h))
  })

  function test (h, t) {
    var child = spawn(node, [bin, h])
    var out = ''
    child.stdout.on('data', function (c) { out += c })
    child.on('close', function (code, signal) {
      t.equal(code, 0)
      t.equal(signal, null)
      t.match(out, /^Usage: rimraf <path> \[<path> \.\.\.\]/)
      t.end()
    })
  }
})

t.test('glob, but matches', function (t) {
  var child = spawn(node, [bin, 'x/y/*.txt'])
  child.on('exit', function (code) {
    t.equal(code, 0)
    t.throws(fs.statSync.bind(fs, 'x/y/*.txt'))
    t.doesNotThrow(fs.statSync.bind(fs, 'x/y/1.txt'))
    t.end()
  })
})

t.test('--no-glob', function (t) {
  t.plan(2)
  t.test('no glob with *.txt', function (t) {
    var child = spawn(node, [bin, 'x/y/*.txt', '-G'])
    child.on('exit', function (code) {
      t.equal(code, 0)
      t.throws(fs.statSync.bind(fs, 'x/y/*.txt'))
      t.doesNotThrow(fs.statSync.bind(fs, 'x/y/1.txt'))
      t.end()
    })
  })
  t.test('no glob with dir star', function (t) {
    var child = spawn(node, [bin, '**/*.txt', '-G'])
    child.on('exit', function (code) {
      t.equal(code, 0)
      t.throws(fs.statSync.bind(fs, 'x/y/*.txt'))
      t.doesNotThrow(fs.statSync.bind(fs, 'x/y/1.txt'))
      t.end()
    })
  })
})

t.test('glob, but no exact match', function (t) {
  var child = spawn(node, [bin, 'x/y/*.txt'])
  child.on('exit', function (code) {
    t.equal(code, 0)
    t.throws(fs.statSync.bind(fs, 'x/y/1.txt'))
    t.throws(fs.statSync.bind(fs, 'x/y/2.txt'))
    t.throws(fs.statSync.bind(fs, 'x/y/3.txt'))
    t.throws(fs.statSync.bind(fs, 'x/y/*.txt'))
    t.end()
  })
})


t.test('cleanup', function (t) {
  rimraf.sync(__dirname + '/bintest')
  t.end()
})
