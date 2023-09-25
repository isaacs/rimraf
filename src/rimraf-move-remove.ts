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

import { basename, parse, resolve } from 'path'
import { defaultTmp, defaultTmpSync } from './default-tmp.js'

import { ignoreENOENT, ignoreENOENTSync } from './ignore-enoent.js'

import {
  chmodSync,
  lstatSync,
  promises as fsPromises,
  renameSync,
  rmdirSync,
  unlinkSync,
} from './fs.js'
const { lstat, rename, unlink, rmdir, chmod } = fsPromises

import { Dirent, Stats } from 'fs'
import { RimrafAsyncOptions, RimrafSyncOptions } from './index.js'
import { readdirOrError, readdirOrErrorSync } from './readdir-or-error.js'

// crypto.randomBytes is much slower, and Math.random() is enough here
const uniqueFilename = (path: string) => `.${basename(path)}.${Math.random()}`

const unlinkFixEPERM = async (path: string) =>
  unlink(path).catch((er: Error & { code?: string }) => {
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

const unlinkFixEPERMSync = (path: string) => {
  try {
    unlinkSync(path)
  } catch (er) {
    if ((er as NodeJS.ErrnoException)?.code === 'EPERM') {
      try {
        return chmodSync(path, 0o666)
      } catch (er2) {
        if ((er2 as NodeJS.ErrnoException)?.code === 'ENOENT') {
          return
        }
        throw er
      }
    } else if ((er as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return
    }
    throw er
  }
}

export const rimrafMoveRemove = async (
  path: string,
  opt: RimrafAsyncOptions
) => {
  if (opt?.signal?.aborted) {
    throw opt.signal.reason
  }
  try {
    return await rimrafMoveRemoveDir(path, opt, await lstat(path))
  } catch (er) {
    if ((er as NodeJS.ErrnoException)?.code === 'ENOENT') return true
    throw er
  }
}

const rimrafMoveRemoveDir = async (
  path: string,
  opt: RimrafAsyncOptions,
  ent: Dirent | Stats
): Promise<boolean> => {
  if (opt?.signal?.aborted) {
    throw opt.signal.reason
  }
  if (!opt.tmp) {
    return rimrafMoveRemoveDir(
      path,
      { ...opt, tmp: await defaultTmp(path) },
      ent
    )
  }
  if (path === opt.tmp && parse(path).root !== path) {
    throw new Error('cannot delete temp directory used for deletion')
  }

  const entries = ent.isDirectory() ? await readdirOrError(path) : null
  if (!Array.isArray(entries)) {
    // this can only happen if lstat/readdir lied, or if the dir was
    // swapped out with a file at just the right moment.
    /* c8 ignore start */
    if (entries) {
      if (entries.code === 'ENOENT') {
        return true
      }
      if (entries.code !== 'ENOTDIR') {
        throw entries
      }
    }
    /* c8 ignore stop */
    if (opt.filter && !(await opt.filter(path, ent))) {
      return false
    }
    await ignoreENOENT(tmpUnlink(path, opt.tmp, unlinkFixEPERM))
    return true
  }

  const removedAll = (
    await Promise.all(
      entries.map(ent => rimrafMoveRemoveDir(resolve(path, ent.name), opt, ent))
    )
  ).reduce((a, b) => a && b, true)
  if (!removedAll) {
    return false
  }

  // we don't ever ACTUALLY try to unlink /, because that can never work
  // but when preserveRoot is false, we could be operating on it.
  // No need to check if preserveRoot is not false.
  if (opt.preserveRoot === false && path === parse(path).root) {
    return false
  }
  if (opt.filter && !(await opt.filter(path, ent))) {
    return false
  }
  await ignoreENOENT(tmpUnlink(path, opt.tmp, rmdir))
  return true
}

const tmpUnlink = async (
  path: string,
  tmp: string,
  rm: (p: string) => Promise<any>
) => {
  const tmpFile = resolve(tmp, uniqueFilename(path))
  await rename(path, tmpFile)
  return await rm(tmpFile)
}

export const rimrafMoveRemoveSync = (path: string, opt: RimrafSyncOptions) => {
  if (opt?.signal?.aborted) {
    throw opt.signal.reason
  }
  try {
    return rimrafMoveRemoveDirSync(path, opt, lstatSync(path))
  } catch (er) {
    if ((er as NodeJS.ErrnoException)?.code === 'ENOENT') return true
    throw er
  }
}

const rimrafMoveRemoveDirSync = (
  path: string,
  opt: RimrafSyncOptions,
  ent: Dirent | Stats
): boolean => {
  if (opt?.signal?.aborted) {
    throw opt.signal.reason
  }
  if (!opt.tmp) {
    return rimrafMoveRemoveDirSync(
      path,
      { ...opt, tmp: defaultTmpSync(path) },
      ent
    )
  }
  const tmp: string = opt.tmp

  if (path === opt.tmp && parse(path).root !== path) {
    throw new Error('cannot delete temp directory used for deletion')
  }

  const entries = ent.isDirectory() ? readdirOrErrorSync(path) : null
  if (!Array.isArray(entries)) {
    // this can only happen if lstat/readdir lied, or if the dir was
    // swapped out with a file at just the right moment.
    /* c8 ignore start */
    if (entries) {
      if (entries.code === 'ENOENT') {
        return true
      }
      if (entries.code !== 'ENOTDIR') {
        throw entries
      }
    }
    /* c8 ignore stop */
    if (opt.filter && !opt.filter(path, ent)) {
      return false
    }
    ignoreENOENTSync(() => tmpUnlinkSync(path, tmp, unlinkFixEPERMSync))
    return true
  }

  let removedAll = true
  for (const ent of entries) {
    const p = resolve(path, ent.name)
    removedAll = rimrafMoveRemoveDirSync(p, opt, ent) && removedAll
  }
  if (!removedAll) {
    return false
  }
  if (opt.preserveRoot === false && path === parse(path).root) {
    return false
  }
  if (opt.filter && !opt.filter(path, ent)) {
    return false
  }
  ignoreENOENTSync(() => tmpUnlinkSync(path, tmp, rmdirSync))
  return true
}

const tmpUnlinkSync = (
  path: string,
  tmp: string,
  rmSync: (p: string) => void
) => {
  const tmpFile = resolve(tmp, uniqueFilename(path))
  renameSync(path, tmpFile)
  return rmSync(tmpFile)
}
