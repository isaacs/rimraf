// https://youtu.be/uhRWMGBjlO8?t=537
//
// 1. readdir
// 2. for each entry
//   a. if a non-empty directory, recurse
//   b. if an empty directory, move to random hidden file name in $TEMP
//   c. unlink/rmdir $TEMP
//
// This works around the fact that unlink/rmdir is non-atomic and takes
// a non-deterministic amount of time to complete.

const { resolve, basename } = require('path')
const { defaultTmp, defaultTmpSync } = require('./default-tmp.js')

const {
  ignoreENOENT,
  ignoreENOENTSync,
} = require('./ignore-enoent.js')

const {
  renameSync,
  unlinkSync,
  rmdirSync,
  chmodSync,
  promises: {
    rename,
    unlink,
    rmdir,
    chmod,
  },
} = require('./fs.js')

const {
  readdirOrError,
  readdirOrErrorSync,
} = require('./readdir-or-error.js')

// crypto.randomBytes is much slower, and Math.random() is enough here
const uniqueFilename = path => `.${basename(path)}.${Math.random()}`

const unlinkFixEPERM = async path => unlink(path).catch(er => {
  if (er.code === 'EPERM') {
    return chmod(path, 0o666).then(
      () => unlink(path),
      er2 => {
        if (er2.code === 'ENOENT')
          return
        throw er
      }
    )
  } else if (er.code === 'ENOENT')
    return
  throw er
})

const unlinkFixEPERMSync = path => {
  try {
    unlinkSync(path)
  } catch (er) {
    if (er.code === 'EPERM') {
      try {
        return chmodSync(path, 0o666)
      } catch (er2) {
        if (er2.code === 'ENOENT')
          return
        throw er
      }
    } else if (er.code === 'ENOENT')
      return
    throw er
  }
}

const rimrafWindows = async (path, opts) => {
  if (!opts.tmp)
    return rimrafWindows(path, { ...opts, tmp: await defaultTmp(path) })

  if (path === opts.tmp)
    throw new Error('cannot delete temp directory used for deletion')

  const entries = await readdirOrError(path)
  if (!Array.isArray(entries)) {
    if (entries.code === 'ENOENT')
      return

    if (entries.code !== 'ENOTDIR')
      throw entries

    return await ignoreENOENT(tmpUnlink(path, opts.tmp, unlinkFixEPERM))
  }

  await Promise.all(entries.map(entry =>
    rimrafWindows(resolve(path, entry), opts)))

  return await ignoreENOENT(tmpUnlink(path, opts.tmp, rmdir))
}

const tmpUnlink = async (path, tmp, rm) => {
  const tmpFile = resolve(tmp, uniqueFilename(path))
  await rename(path, tmpFile)
  return await rm(tmpFile)
}

const rimrafWindowsSync = (path, opts) => {
  if (!opts.tmp)
    return rimrafWindowsSync(path, { ...opts, tmp: defaultTmpSync(path) })

  if (path === opts.tmp)
    throw new Error('cannot delete temp directory used for deletion')

  const entries = readdirOrErrorSync(path)
  if (!Array.isArray(entries)) {
    if (entries.code === 'ENOENT')
      return

    if (entries.code !== 'ENOTDIR')
      throw entries

    return ignoreENOENTSync(() =>
      tmpUnlinkSync(path, opts.tmp, unlinkFixEPERMSync))
  }

  for (const entry of entries)
    rimrafWindowsSync(resolve(path, entry), opts)

  return ignoreENOENTSync(() => tmpUnlinkSync(path, opts.tmp, rmdirSync))
}

const tmpUnlinkSync = (path, tmp, rmSync) => {
  const tmpFile = resolve(tmp, uniqueFilename(path))
  renameSync(path, tmpFile)
  return rmSync(tmpFile)
}

module.exports = {
  rimrafWindows,
  rimrafWindowsSync,
}
