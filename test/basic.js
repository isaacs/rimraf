var rimraf = require('../')
var t = require('tap')

var fs = require('fs')
var fill = require('./fill.js')

t.test('initial clean', function (t) {
  rimraf.sync(__dirname + '/target')
  t.throws(function () {
    fs.statSync(__dirname + '/target')
  })
  t.end()
})

t.test('sync removal', function (t) {
  fill()
  t.ok(fs.statSync(__dirname + '/target').isDirectory())

  rimraf.sync(__dirname + '/target')
  t.throws(function () {
    fs.statSync(__dirname + '/target')
  })
  t.end()
})

t.test('async removal', function (t) {
  fill()
  t.ok(fs.statSync(__dirname + '/target').isDirectory())

  rimraf(__dirname + '/target', function (er) {
    if (er)
      throw er
    t.throws(function () {
      fs.statSync(__dirname + '/target')
    })
    t.end()
  })
})

t.test('glob', function (t) {
  t.plan(3)
  t.test('async', function (t) {
    fill()
    var glob = require('glob')
    var pattern = __dirname + '/target/f-*'
    var before = glob.sync(pattern)
    t.notEqual(before.length, 0)
    rimraf(pattern, function (er) {
      if (er)
        throw er
      var after = glob.sync(pattern)
      t.same(after, [])
      rimraf.sync(__dirname + '/target')
      t.end()
    })
  })
  t.test('sync', function (t) {
    fill()
    var glob = require('glob')
    var pattern = __dirname + '/target/f-*'
    var before = glob.sync(pattern)
    t.notEqual(before.length, 0)
    rimraf.sync(pattern)
    var after = glob.sync(pattern)
    t.same(after, [])
    rimraf.sync(__dirname + '/target')
    t.end()
  })
  t.test('modified cwd', function (t) {
    fill()
    var glob = require('glob')
    var pattern = 'target/f-*'
    var globOpts = {
      cwd: __dirname
    }
    var before = glob.sync(pattern, globOpts)
    t.notEqual(before.length, 0)
    rimraf.sync(pattern, {
      glob: globOpts
    })
    var after = glob.sync(pattern, globOpts)
    t.same(after, [])
    rimraf.sync(__dirname + '/target')
    t.end()
  })
})

t.test('no glob', function (t) {
  t.plan(2)
  t.test('async', function (t) {
    fill()
    var glob = require('glob')
    var pattern = __dirname + '/target/f-*'
    var before = glob.sync(pattern)
    t.notEqual(before.length, 0)
    rimraf(pattern, { disableGlob: true }, function (er) {
      if (er)
        throw er
      var after = glob.sync(pattern)
      t.same(after, before)
      rimraf.sync(__dirname + '/target')
      t.end()
    })
  })
  t.test('sync', function (t) {
    fill()
    var glob = require('glob')
    var pattern = __dirname + '/target/f-*'
    var before = glob.sync(pattern)
    t.notEqual(before.length, 0)
    rimraf.sync(pattern, { disableGlob: true })
    var after = glob.sync(pattern)
    t.same(after, before)
    rimraf.sync(__dirname + '/target')
    t.end()
  })
})

t.test('verify that cleanup happened', function (t) {
  t.throws(fs.statSync.bind(fs, __dirname + '/../target'))
  t.throws(fs.statSync.bind(fs, __dirname + '/target'))
  t.end()
})
