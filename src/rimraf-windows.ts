// This is the same as rimrafPosix, with the following changes:
//
// 1. EBUSY, ENFILE, EMFILE trigger retries and/or exponential backoff
// 2. All non-directories are removed first and then all directories are
//    removed in a second sweep.
// 3. If we hit ENOTEMPTY in the second sweep, fall back to move-remove on
//    the that folder.
//
// Note: "move then remove" is 2-10 times slower, and just as unreliable.

import { parse, resolve } from 'path'
import { RimrafAsyncOptions, RimrafSyncOptions } from '.'
import { fixEPERM, fixEPERMSync } from './fix-eperm.js'
import { promises, rmdirSync, unlinkSync } from './fs.js'
import { ignoreENOENT, ignoreENOENTSync } from './ignore-enoent.js'
import { readdirOrError, readdirOrErrorSync } from './readdir-or-error.js'
import { retryBusy, retryBusySync } from './retry-busy.js'
import { rimrafMoveRemove, rimrafMoveRemoveSync } from './rimraf-move-remove.js'
const { unlink, rmdir } = promises

const rimrafWindowsFile = retryBusy(fixEPERM(unlink))
const rimrafWindowsFileSync = retryBusySync(fixEPERMSync(unlinkSync))
const rimrafWindowsDir = retryBusy(fixEPERM(rmdir))
const rimrafWindowsDirSync = retryBusySync(fixEPERMSync(rmdirSync))

const rimrafWindowsDirMoveRemoveFallback = async (
  path: string,
  opt: RimrafAsyncOptions
): Promise<boolean> => {
  /* c8 ignore start */
  if (opt?.signal?.aborted) {
    throw opt.signal.reason
  }
  /* c8 ignore stop */
  // already filtered, remove from options so we don't call unnecessarily
  const { filter, ...options } = opt
  try {
    return await rimrafWindowsDir(path, options)
  } catch (er) {
    if ((er as NodeJS.ErrnoException)?.code === 'ENOTEMPTY') {
      return await rimrafMoveRemove(path, options)
    }
    throw er
  }
}

const rimrafWindowsDirMoveRemoveFallbackSync = (
  path: string,
  opt: RimrafSyncOptions
): boolean => {
  if (opt?.signal?.aborted) {
    throw opt.signal.reason
  }
  // already filtered, remove from options so we don't call unnecessarily
  const { filter, ...options } = opt
  try {
    return rimrafWindowsDirSync(path, options)
  } catch (er) {
    const fer = er as NodeJS.ErrnoException
    if (fer?.code === 'ENOTEMPTY') {
      return rimrafMoveRemoveSync(path, options)
    }
    throw er
  }
}

const START = Symbol('start')
const CHILD = Symbol('child')
const FINISH = Symbol('finish')
const states = new Set([START, CHILD, FINISH])

export const rimrafWindows = async (
  path: string,
  opt: RimrafAsyncOptions,
  state = START
): Promise<boolean> => {
  if (opt?.signal?.aborted) {
    throw opt.signal.reason
  }
  if (!states.has(state)) {
    throw new TypeError('invalid third argument passed to rimraf')
  }

  const entries = await readdirOrError(path)
  if (!Array.isArray(entries)) {
    if (entries.code === 'ENOENT') {
      return true
    }
    if (entries.code !== 'ENOTDIR') {
      throw entries
    }
    if (opt.filter && !(await opt.filter(path))) {
      return false
    }
    // is a file
    await ignoreENOENT(rimrafWindowsFile(path, opt))
    return true
  }

  const s = state === START ? CHILD : state
  const removedAll = (
    await Promise.all(
      entries.map(entry => rimrafWindows(resolve(path, entry), opt, s))
    )
  ).reduce((a, b) => a && b, true)

  if (state === START) {
    return rimrafWindows(path, opt, FINISH)
  } else if (state === FINISH) {
    if (opt.preserveRoot === false && path === parse(path).root) {
      return false
    }
    if (!removedAll) {
      return false
    }
    if (opt.filter && !(await opt.filter(path))) {
      return false
    }
    await ignoreENOENT(rimrafWindowsDirMoveRemoveFallback(path, opt))
  }
  return true
}

export const rimrafWindowsSync = (
  path: string,
  opt: RimrafSyncOptions,
  state = START
): boolean => {
  if (!states.has(state)) {
    throw new TypeError('invalid third argument passed to rimraf')
  }

  const entries = readdirOrErrorSync(path)
  if (!Array.isArray(entries)) {
    if (entries.code === 'ENOENT') {
      return true
    }
    if (entries.code !== 'ENOTDIR') {
      throw entries
    }
    if (opt.filter && !opt.filter(path)) {
      return false
    }
    // is a file
    ignoreENOENTSync(() => rimrafWindowsFileSync(path, opt))
    return true
  }

  let removedAll = true
  for (const entry of entries) {
    const s = state === START ? CHILD : state
    removedAll = rimrafWindowsSync(resolve(path, entry), opt, s) && removedAll
  }

  if (state === START) {
    return rimrafWindowsSync(path, opt, FINISH)
  } else if (state === FINISH) {
    if (opt.preserveRoot === false && path === parse(path).root) {
      return false
    }
    if (!removedAll) {
      return false
    }
    if (opt.filter && !opt.filter(path)) {
      return false
    }
    ignoreENOENTSync(() => {
      rimrafWindowsDirMoveRemoveFallbackSync(path, opt)
    })
  }
  return true
}
