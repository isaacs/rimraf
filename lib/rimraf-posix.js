// the simple recursive removal, where unlink and rmdir are atomic
// Note that this approach does NOT work on Windows!
// We rmdir before unlink even though that is arguably less efficient
// (since the average folder contains >1 file, it means more system
// calls), because sunos will let root unlink a directory, and some
// SUPER weird breakage happens as a result.

const {
  rmdirSync,
  unlinkSync,
  promises: {
    rmdir,
    unlink,
  },
} = require('fs')

const { resolve } = require('path')

const {
  readdirOrError,
  readdirOrErrorSync,
} = require('./readdir-or-error.js')

const rimrafPosix = async (path, options) => {
  const entries = await readdirOrError(path)
  if (!Array.isArray(entries)) {
    if (entries.code === 'ENOENT')
      return
    if (entries.code !== 'ENOTDIR')
      throw entries
    return unlink(path)
  }
  await Promise.all(entries.map(entry =>
    rimrafPosix(resolve(path, entry), options)))
  return rmdir(path)
}

const rimrafPosixSync = (path, opt) => {
  const entries = readdirOrErrorSync(path)
  if (!Array.isArray(entries)) {
    if (entries.code === 'ENOENT')
      return
    if (entries.code !== 'ENOTDIR')
      throw entries
    return unlinkSync(path)
  }
  for (const entry of entries)
    rimrafPosixSync(resolve(path, entry), opt)
  return rmdirSync(path)
}

module.exports = {
  rimrafPosix,
  rimrafPosixSync,
}
