var rimraf = require('../')
var t = require('tap')

var fs = require('fs')
var mockfs = require('mock-fs')
var fill = require('./fill.js')
var mkdirp = require('mkdirp')

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
    rimraf(pattern, {
      disableGlob: true
    }, function (er) {
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
    rimraf.sync(pattern, {
      disableGlob: true
    })
    var after = glob.sync(pattern)
    t.same(after, before)
    rimraf.sync(__dirname + '/target')
    t.end()
  })

})


t.test('opts fs', function (t) {
  t.plan(2);


  t.test('async', function (t) {
    t.plan(4);

    var x = Math.floor(Math.random() * Math.pow(16,4)).toString(16);
    var y = Math.floor(Math.random() * Math.pow(16,4)).toString(16);
    var z = Math.floor(Math.random() * Math.pow(16,4)).toString(16);
    
    var file = '/cow/boy/' + [x,y,z].join('/');
    var xfs = mockfs.fs()

    mkdirp(file, {
      fs: xfs
    }, function (err) {
      t.ifError(err)

      rimraf(file, {
        fs: xfs
      }, function () {
        t.ifError(err)

        xfs.exists(file, function (ex) {
          t.notOk(ex, 'file deleted')
          xfs.stat(file, function (err, stat) {
            t.ok(err)
            t.end()
          });
        });

      });

    });
  });


  t.test('sync', function (t) {
    t.plan(2);

    var x = Math.floor(Math.random() * Math.pow(16,4)).toString(16);
    var y = Math.floor(Math.random() * Math.pow(16,4)).toString(16);
    var z = Math.floor(Math.random() * Math.pow(16,4)).toString(16);
    
    var file = '/cow/boy/' + [x,y,z].join('/');
    var xfs = mockfs.fs()

    mkdirp.sync(file, {
      fs: xfs
    });
    rimraf.sync(file, {
      fs: xfs
    })

    xfs.exists(file, function (ex) {
      t.notOk(ex, 'file deleted')
      xfs.stat(file, function (err, stat) {
        t.ok(err)
        t.end()
      });
    });



  });



});







t.test('verify that cleanup happened', function (t) {
  t.throws(fs.statSync.bind(fs, __dirname + '/../target'))
  t.throws(fs.statSync.bind(fs, __dirname + '/target'))
  t.end()
})