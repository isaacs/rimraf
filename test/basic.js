var rimraf = require('../')
var t = require('tap')

var fs = require('fs')
var fill = require('./fill.js')

t.test('Windows check', function (t) {
	if (process.platform.match(/^win/)) {
		var exec = require('child_process').spawnSync
		var spawnedProc = exec('NET', [ 'SESSION' ])
		if (spawnedProc.status) {
			t.plan(0, 'Skip on Windows when not running as administrator')
			process.exit()
			return
		}
	}
	t.end()
})

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
  t.plan(2)
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
