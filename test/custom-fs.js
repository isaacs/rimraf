var rimraf = require('../')
var fs = require('fs')
var path = require('path')
var t = require('tap')

process.chdir(__dirname)

// track that all the things happened
var keepDirs = {}
var intercepted = {}
function intercept (method, path) {
  intercepted[method] = intercepted[method] || []
  intercepted[method].push(path)
  intercepted[method] = intercepted[method].sort()
  intercepted._saved = intercepted._saved.sort()
  intercepted._removed = intercepted._removed.sort()
}

function makePath(path) {
  return path.replace(/\//g, '\\');
}

function makePaths(expected) {
  if (process.platform !== 'win32')
    return expected
  if (typeof expected === 'string') {
    return makePath(expected);
  }
  if (expected instanceof Array) {
    return expected.map(makePath);
  }
  if (typeof expected === 'object') {
    let returned = {};
    for (let key in expected) {
      returned[makePath(key)] = expected[key];
    }
    return returned;
  }
  return expected;
}

var expectAsync = {
  _removed: makePaths([
    'a',
    'a/x',
    'a/x/some-file.txt',
    'a/y',
    'a/y/some-file.txt',
    'a/z',
    'a/z/some-file.txt'
  ]),
  _saved: makePaths([
    'a',
    'a/x',
    'a/x/keep.txt',
    'a/y',
    'a/y/keep.txt',
    'a/z',
    'a/z/keep.txt'
  ]),
  _keepDirs: makePaths({ 'a/x': true, 'a/y': true, 'a/z': true, a: true, '.': true }),
  rmdir: makePaths([
    'a',
    'a',
    'a/x',
    'a/x',
    'a/y',
    'a/y',
    'a/z',
    'a/z'
  ]),
  unlink: makePaths([
    'a/x/keep.txt',
    'a/x/some-file.txt',
    'a/y/keep.txt',
    'a/y/some-file.txt',
    'a/z/keep.txt',
    'a/z/some-file.txt'
  ])
}

var expectSync = {
  _removed: makePaths([
    'a',
    'a/x',
    'a/x/some-file.txt',
    'a/y',
    'a/y/some-file.txt',
    'a/z',
    'a/z/some-file.txt'
  ]),
  _saved: makePaths([
    'a',
    'a/x',
    'a/x/keep.txt',
    'a/y',
    'a/y/keep.txt',
    'a/z',
    'a/z/keep.txt'
  ]),
  _keepDirs: makePaths({ 'a/x': true, a: true, 'a/y': true, 'a/z': true, '.': true }),
  rmdirSync: makePaths([
    'a',
    'a',
    'a/x',
    'a/x',
    'a/y',
    'a/y',
    'a/z',
    'a/z'
  ]),
  unlinkSync: makePaths([
    'a/x/keep.txt',
    'a/x/some-file.txt',
    'a/y/keep.txt',
    'a/y/some-file.txt',
    'a/z/keep.txt',
    'a/z/some-file.txt'
  ])
}

function shouldRemove (file) {
  if (file.match(/keep.txt$/) || keepDirs[file]) {
    // add the parent dir to keeps, to avoid ENOTEMPTY
    intercepted._saved.push(file)
    intercepted._saved = intercepted._saved.sort()
    keepDirs[path.dirname(file)] = true
    return false
  } else {
    intercepted._removed.push(file)
    intercepted._removed = intercepted._removed.sort()
    return true
  }
}

var myFs = {
  unlink: function (file, cb) {
    intercept('unlink', file)
    if (shouldRemove(file)) {
      return fs.unlink(file, cb)
    } else {
      return cb()
    }
  },
  unlinkSync: function (file) {
    intercept('unlinkSync', file)
    if (shouldRemove(file)) {
      return fs.unlinkSync(file)
    }
  },
  rmdir: function (file, cb) {
    intercept('rmdir', file)
    if (shouldRemove(file)) {
      return fs.rmdir(file, cb)
    } else {
      return cb()
    }
  },
  rmdirSync: function (file) {
    intercept('rmdirSync', file)
    if (shouldRemove(file)) {
      return fs.rmdirSync(file)
    }
  }
}

var mkdirp = require('mkdirp')

function create () {
  intercepted = {}
  intercepted._removed = []
  intercepted._saved = []
  intercepted._keepDirs = keepDirs = {}
  mkdirp.sync('a')
  ;['x', 'y', 'z'].forEach(function (j) {
    mkdirp.sync('a/' + j)
    fs.writeFileSync('a/' + j + '/some-file.txt', 'test\n')
    fs.writeFileSync('a/' + j + '/keep.txt', 'test\n')
  })
}

t.test('setup', function (t) {
  create()
  t.end()
})

t.test('rimraf with interceptor', function (t) {
  rimraf('a', myFs, function (er) {
    if (er) {
      throw er
    }
    t.strictSame(intercepted, expectAsync)
    create()
    t.end()
  })
})

t.test('rimraf sync with interceptor', function (t) {
  create()
  rimraf.sync('a', myFs)
  t.strictSame(intercepted, expectSync)
  create()
  t.end()
})

t.test('cleanup', function (t) {
  rimraf.sync('a')
  t.throws(fs.statSync.bind(fs, 'a'))
  t.end()
})
