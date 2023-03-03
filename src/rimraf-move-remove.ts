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
  promises as fsPromises,
  renameSync,
  rmdirSync,
  unlinkSync,
} from './fs.js'
const { rename, unlink, rmdir, chmod } = fsPromises

import { RimrafOptions } from '.'
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
  opt: RimrafOptions
): Promise<boolean> => {
  if (opt?.signal?.aborted) {
    throw opt.signal.reason
  }
  if (!opt.tmp) {
    return rimrafMoveRemove(path, { ...opt, tmp: await defaultTmp(path) })
  }
  if (path === opt.tmp && parse(path).root !== path) {
    throw new Error('cannot delete temp directory used for deletion')
  }

  const entries = await readdirOrError(path)
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
    await ignoreENOENT(tmpUnlink(path, opt.tmp, unlinkFixEPERM))
    return true
  }

  const removedAll = (
    await Promise.all(
      entries.map(entry => rimrafMoveRemove(resolve(path, entry), opt))
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
  if (opt.filter && !opt.filter(path)) {
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

export const rimrafMoveRemoveSync = (
  path: string,
  opt: RimrafOptions
): boolean => {
  if (opt?.signal?.aborted) {
    throw opt.signal.reason
  }
  if (!opt.tmp) {
    return rimrafMoveRemoveSync(path, { ...opt, tmp: defaultTmpSync(path) })
  }
  const tmp: string = opt.tmp

  if (path === opt.tmp && parse(path).root !== path) {
    throw new Error('cannot delete temp directory used for deletion')
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
    ignoreENOENTSync(() => tmpUnlinkSync(path, tmp, unlinkFixEPERMSync))
    return true
  }

  let removedAll = true
  for (const entry of entries) {
    removedAll = rimrafMoveRemoveSync(resolve(path, entry), opt) && removedAll
  }
  if (!removedAll) {
    return false
  }
  if (opt.preserveRoot === false && path === parse(path).root) {
    return false
  }
  if (opt.filter && !opt.filter(path)) {
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
