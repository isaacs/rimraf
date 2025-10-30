// the simple recursive removal, where unlink and rmdir are atomic
// Note that this approach does NOT work on Windows!
// We stat first and only unlink if the Dirent isn't a directory,
// because sunos will let root unlink a directory, and some
// SUPER weird breakage happens as a result.

import { lstatSync, promises, rmdirSync, unlinkSync } from './fs.js'
import { parse, resolve } from 'path'
import { readdirOrError, readdirOrErrorSync } from './readdir-or-error.js'
import { Dirent, Stats } from 'fs'
import { RimrafAsyncOptions, RimrafSyncOptions } from './index.js'
import { ignoreENOENT, ignoreENOENTSync } from './ignore-enoent.js'
import { errorCode } from './error.js'
const { lstat, rmdir, unlink } = promises

export const rimrafPosix = async (path: string, opt: RimrafAsyncOptions) => {
  opt?.signal?.throwIfAborted()
  return (
    (await ignoreENOENT(
      lstat(path).then(stat => rimrafPosixDir(path, opt, stat)),
    )) ?? true
  )
}

export const rimrafPosixSync = (path: string, opt: RimrafSyncOptions) => {
  opt?.signal?.throwIfAborted()
  return (
    ignoreENOENTSync(() => rimrafPosixDirSync(path, opt, lstatSync(path))) ??
    true
  )
}

const rimrafPosixDir = async (
  path: string,
  opt: RimrafAsyncOptions,
  ent: Dirent | Stats,
): Promise<boolean> => {
  opt?.signal?.throwIfAborted()
  const entries = ent.isDirectory() ? await readdirOrError(path) : null
  if (!Array.isArray(entries)) {
    // this can only happen if lstat/readdir lied, or if the dir was
    // swapped out with a file at just the right moment.
    /* c8 ignore start */
    if (entries) {
      if (errorCode(entries) === 'ENOENT') {
        return true
      }
      if (errorCode(entries) !== 'ENOTDIR') {
        throw entries
      }
    }
    /* c8 ignore stop */
    if (opt.filter && !(await opt.filter(path, ent))) {
      return false
    }
    await ignoreENOENT(unlink(path))
    return true
  }

  const removedAll = (
    await Promise.all(
      entries.map(ent => rimrafPosixDir(resolve(path, ent.name), opt, ent)),
    )
  ).every(v => v === true)

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

  await ignoreENOENT(rmdir(path))
  return true
}

const rimrafPosixDirSync = (
  path: string,
  opt: RimrafSyncOptions,
  ent: Dirent | Stats,
): boolean => {
  opt?.signal?.throwIfAborted()
  const entries = ent.isDirectory() ? readdirOrErrorSync(path) : null
  if (!Array.isArray(entries)) {
    // this can only happen if lstat/readdir lied, or if the dir was
    // swapped out with a file at just the right moment.
    /* c8 ignore start */
    if (entries) {
      if (errorCode(entries) === 'ENOENT') {
        return true
      }
      if (errorCode(entries) !== 'ENOTDIR') {
        throw entries
      }
    }
    /* c8 ignore stop */
    if (opt.filter && !opt.filter(path, ent)) {
      return false
    }
    ignoreENOENTSync(() => unlinkSync(path))
    return true
  }
  let removedAll: boolean = true
  for (const ent of entries) {
    const p = resolve(path, ent.name)
    removedAll = rimrafPosixDirSync(p, opt, ent) && removedAll
  }
  if (opt.preserveRoot === false && path === parse(path).root) {
    return false
  }

  if (!removedAll) {
    return false
  }

  if (opt.filter && !opt.filter(path, ent)) {
    return false
  }

  ignoreENOENTSync(() => rmdirSync(path))
  return true
}
