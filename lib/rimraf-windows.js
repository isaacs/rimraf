// This is the same as rimrafPosix, with the following changes:
//
// 1. EBUSY, ENFILE, EMFILE trigger retries and/or exponential backoff
// 2. All non-directories are removed first and then all directories are
//    removed in a second sweep.
// 3. If we hit ENOTEMPTY in the second sweep, fall back to move-remove on
//    the that folder.
//
// Note: "move then remove" is 2-10 times slower, and just as unreliable.

const { resolve, parse } = require('path')

const {
  ignoreENOENT,
  ignoreENOENTSync,
} = require('./ignore-enoent.js')

const {
  unlinkSync,
  rmdirSync,
  promises: {
    unlink,
    rmdir,
  },
} = require('./fs.js')

const { fixEPERM, fixEPERMSync } = require('./fix-eperm.js')

const {
  readdirOrError,
  readdirOrErrorSync,
} = require('./readdir-or-error.js')

const {
  retryBusy,
  retryBusySync,
} = require('./retry-busy.js')

const {
  rimrafMoveRemove,
  rimrafMoveRemoveSync,
} = require('./rimraf-move-remove.js')

const rimrafWindowsFile = retryBusy(fixEPERM(unlink))
const rimrafWindowsFileSync = retryBusySync(fixEPERMSync(unlinkSync))
const rimrafWindowsDir = retryBusy(fixEPERM(rmdir))
const rimrafWindowsDirSync = retryBusySync(fixEPERMSync(rmdirSync))

const rimrafWindowsDirMoveRemoveFallback = async (path, opt) => {
  try {
    await rimrafWindowsDir(path, opt)
  } catch (er) {
    if (er.code === 'ENOTEMPTY') {
      return await rimrafMoveRemove(path, opt)
    }
    throw er
  }
}

const rimrafWindowsDirMoveRemoveFallbackSync = (path, opt) => {
  try {
    rimrafWindowsDirSync(path, opt)
  } catch (er) {
    if (er.code === 'ENOTEMPTY') {
      return rimrafMoveRemoveSync(path, opt)
    }
    throw er
  }
}

const START = Symbol('start')
const CHILD = Symbol('child')
const FINISH = Symbol('finish')
const states = new Set([START, CHILD, FINISH])

const rimrafWindows = async (path, opt, state = START) => {
  if (!states.has(state)) {
    throw new TypeError('invalid third argument passed to rimraf')
  }

  const entries = await readdirOrError(path)
  if (!Array.isArray(entries)) {
    if (entries.code === 'ENOENT') {
      return
    }
    if (entries.code !== 'ENOTDIR') {
      throw entries
    }
    // is a file
    return ignoreENOENT(rimrafWindowsFile(path, opt))
  }

  await Promise.all(entries.map(entry =>
    rimrafWindows(resolve(path, entry), opt, state === START ? CHILD : state)))

  if (state === START) {
    return rimrafWindows(path, opt, FINISH)
  } else if (state === FINISH) {
    if (opt.preserveRoot === false && path === parse(path).root) {
      return
    }
    return ignoreENOENT(rimrafWindowsDirMoveRemoveFallback(path, opt))
  }
}

const rimrafWindowsSync = (path, opt, state = START) => {
  if (!states.has(state)) {
    throw new TypeError('invalid third argument passed to rimraf')
  }

  const entries = readdirOrErrorSync(path)
  if (!Array.isArray(entries)) {
    if (entries.code === 'ENOENT') {
      return
    }
    if (entries.code !== 'ENOTDIR') {
      throw entries
    }
    // is a file
    return ignoreENOENTSync(() => rimrafWindowsFileSync(path, opt))
  }

  for (const entry of entries) {
    const s = state === START ? CHILD : state
    rimrafWindowsSync(resolve(path, entry), opt, s)
  }

  if (state === START) {
    return rimrafWindowsSync(path, opt, FINISH)
  } else if (state === FINISH) {
    if (opt.preserveRoot === false && path === parse(path).root) {
      return
    }
    return ignoreENOENTSync(() => {
      rimrafWindowsDirMoveRemoveFallbackSync(path, opt)
    })
  }
}

module.exports = {
  rimrafWindows,
  rimrafWindowsSync,
}
