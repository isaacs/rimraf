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
//
// However, it is HELLA SLOW, like 2-10x slower than a naive recursive rm.

const { resolve, basename, parse } = require('path')
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
        if (er2.code === 'ENOENT') {
          return
        }
        throw er
      }
    )
  } else if (er.code === 'ENOENT') {
    return
  }
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
        if (er2.code === 'ENOENT') {
          return
        }
        throw er
      }
    } else if (er.code === 'ENOENT') {
      return
    }
    throw er
  }
}

const rimrafMoveRemove = async (path, opt) => {
  if (!opt.tmp) {
    return rimrafMoveRemove(path, { ...opt, tmp: await defaultTmp(path) })
  }

  if (path === opt.tmp && parse(path).root !== path) {
    throw new Error('cannot delete temp directory used for deletion')
  }

  const entries = await readdirOrError(path)
  if (!Array.isArray(entries)) {
    if (entries.code === 'ENOENT') {
      return
    }

    if (entries.code !== 'ENOTDIR') {
      throw entries
    }

    return await ignoreENOENT(tmpUnlink(path, opt.tmp, unlinkFixEPERM))
  }

  await Promise.all(entries.map(entry =>
    rimrafMoveRemove(resolve(path, entry), opt)))

  // we don't ever ACTUALLY try to unlink /, because that can never work
  // but when preserveRoot is false, we could be operating on it.
  // No need to check if preserveRoot is not false.
  if (opt.preserveRoot === false && path === parse(path).root) {
    return
  }

  return await ignoreENOENT(tmpUnlink(path, opt.tmp, rmdir))
}

const tmpUnlink = async (path, tmp, rm) => {
  const tmpFile = resolve(tmp, uniqueFilename(path))
  await rename(path, tmpFile)
  return await rm(tmpFile)
}

const rimrafMoveRemoveSync = (path, opt) => {
  if (!opt.tmp) {
    return rimrafMoveRemoveSync(path, { ...opt, tmp: defaultTmpSync(path) })
  }

  if (path === opt.tmp && parse(path).root !== path) {
    throw new Error('cannot delete temp directory used for deletion')
  }

  const entries = readdirOrErrorSync(path)
  if (!Array.isArray(entries)) {
    if (entries.code === 'ENOENT') {
      return
    }

    if (entries.code !== 'ENOTDIR') {
      throw entries
    }

    return ignoreENOENTSync(() =>
      tmpUnlinkSync(path, opt.tmp, unlinkFixEPERMSync))
  }

  for (const entry of entries) {
    rimrafMoveRemoveSync(resolve(path, entry), opt)
  }

  if (opt.preserveRoot === false && path === parse(path).root) {
    return
  }

  return ignoreENOENTSync(() => tmpUnlinkSync(path, opt.tmp, rmdirSync))
}

const tmpUnlinkSync = (path, tmp, rmSync) => {
  const tmpFile = resolve(tmp, uniqueFilename(path))
  renameSync(path, tmpFile)
  return rmSync(tmpFile)
}

module.exports = {
  rimrafMoveRemove,
  rimrafMoveRemoveSync,
}
