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

var expectAsync = {
  _removed: [
    __dirname + "/a",
    __dirname + "/a/x",
    __dirname + "/a/x/some-file.txt",
    __dirname + "/a/y",
    __dirname + "/a/y/some-file.txt",
    __dirname + "/a/z",
    __dirname + "/a/z/some-file.txt"
  ],
  _saved: [
    __dirname + "/a",
    __dirname + "/a/x",
    __dirname + "/a/x/keep.txt",
    __dirname + "/a/y",
    __dirname + "/a/y/keep.txt",
    __dirname + "/a/z",
    __dirname + "/a/z/keep.txt"
  ],
  _keepDirs: {
    [__dirname + "/a/x"]: true,
    [__dirname + "/a"]: true,
    [__dirname + "/a/y"]: true,
    [__dirname + "/a/z"]: true,
    [__dirname + ""]: true
  },
  rmdir: [
    __dirname + "/a",
    __dirname + "/a",
    __dirname + "/a/x",
    __dirname + "/a/x",
    __dirname + "/a/y",
    __dirname + "/a/y",
    __dirname + "/a/z",
    __dirname + "/a/z"
  ],
  unlink: [
    __dirname + "/a/x/keep.txt",
    __dirname + "/a/x/some-file.txt",
    __dirname + "/a/y/keep.txt",
    __dirname + "/a/y/some-file.txt",
    __dirname + "/a/z/keep.txt",
    __dirname + "/a/z/some-file.txt"
  ]
};

var expectSync = {
  _removed: [
    __dirname + "/a",
    __dirname + "/a/x",
    __dirname + "/a/x/some-file.txt",
    __dirname + "/a/y",
    __dirname + "/a/y/some-file.txt",
    __dirname + "/a/z",
    __dirname + "/a/z/some-file.txt"
  ],
  _saved: [
    __dirname + "/a",
    __dirname + "/a/x",
    __dirname + "/a/x/keep.txt",
    __dirname + "/a/y",
    __dirname + "/a/y/keep.txt",
    __dirname + "/a/z",
    __dirname + "/a/z/keep.txt"
  ],
  _keepDirs: {
    [__dirname + "/a/x"]: true,
    [__dirname + "/a"]: true,
    [__dirname + "/a/y"]: true,
    [__dirname + "/a/z"]: true,
    [__dirname + ""]: true
  },
  rmdirSync: [
    __dirname + "/a",
    __dirname + "/a",
    __dirname + "/a/x",
    __dirname + "/a/x",
    __dirname + "/a/y",
    __dirname + "/a/y",
    __dirname + "/a/z",
    __dirname + "/a/z"
  ],
  unlinkSync: [
    __dirname + "/a/x/keep.txt",
    __dirname + "/a/x/some-file.txt",
    __dirname + "/a/y/keep.txt",
    __dirname + "/a/y/some-file.txt",
    __dirname + "/a/z/keep.txt",
    __dirname + "/a/z/some-file.txt"
  ]
};

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
