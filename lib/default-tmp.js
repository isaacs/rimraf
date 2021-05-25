// The default temporary folder location for use in the windows algorithm.
// It's TEMPting to use dirname(path), since that's guaranteed to be on the
// same device.  However, this means that:
// rimraf(path).then(() => rimraf(dirname(path)))
// will often fail with EBUSY, because the parent dir contains
// marked-for-deletion directory entries (which do not show up in readdir).
// The approach here is to use os.tmpdir() if it's on the same drive letter,
// or resolve(path, '\\temp') if it exists, or the root of the drive if not.
// On Posix (not that you'd be likely to use the windows algorithm there),
// it uses os.tmpdir() always.
const platform = require('./platform.js')
const { statSync, promises: { stat } } = require('./fs.js')
const { tmpdir } = require('os')
const { parse, resolve } = require('path')

const isDirSync = path => {
  try {
    return statSync(path).isDirectory()
  } catch (er) {
    return false
  }
}

const isDir = path => stat(path).then(st => st.isDirectory(), () => false)

const win32DefaultTmp = async path => {
  const { root } = parse(path)
  const tmp = tmpdir()
  const { root: tmpRoot } = parse(tmp)
  if (root.toLowerCase() === tmpRoot.toLowerCase())
    return tmp

  const driveTmp = resolve(root, '/temp')
  if (await isDir(driveTmp))
    return driveTmp

  return root
}

const win32DefaultTmpSync = path => {
  const { root } = parse(path)
  const tmp = tmpdir()
  const { root: tmpRoot } = parse(tmp)
  if (root.toLowerCase() === tmpRoot.toLowerCase())
    return tmp

  const driveTmp = resolve(root, '/temp')
  if (isDirSync(driveTmp))
    return driveTmp

  return root
}

const posixDefaultTmp = async () => tmpdir()
const posixDefaultTmpSync = () => tmpdir()

module.exports = platform === 'win32' ? {
  defaultTmp: win32DefaultTmp,
  defaultTmpSync: win32DefaultTmpSync,
} : {
  defaultTmp: posixDefaultTmp,
  defaultTmpSync: posixDefaultTmpSync,
}
