var rimraf = require('../')
var t = require('tap')

var fs = require('fs')
var fill = require('./fill.js')

t.test('promise async removal', function (t) {
  fill()
  t.ok(fs.statSync(__dirname + '/target').isDirectory())

  rimraf(__dirname + '/target')
  .then(function () {
    t.throws(function () {
      fs.statSync(__dirname + '/target')
    })
    t.end()
  })
})

t.test('promise no glob', function (t) {
  t.plan(3)
  fill()
  var glob = require('glob')
  var pattern = __dirname + '/target/f-*'
  var before = glob.sync(pattern)
  t.notEqual(before.length, 0)
  rimraf(pattern, { disableGlob: true })
  .then(function () {
    var after = glob.sync(pattern)
    t.same(after, before)
    rimraf(__dirname + '/target')
    .then(function () {
      t.throws(function () {
        fs.statSync(__dirname + '/target')
      })
    })
  })
  .catch(t.fail)
})

t.test('verify that cleanup happened', function (t) {
  t.throws(fs.statSync.bind(fs, __dirname + '/../target'))
  t.throws(fs.statSync.bind(fs, __dirname + '/target'))
  t.end()
})
