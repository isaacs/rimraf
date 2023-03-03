// the simple recursive removal, where unlink and rmdir are atomic
// Note that this approach does NOT work on Windows!
// We rmdir before unlink even though that is arguably less efficient
// (since the average folder contains >1 file, it means more system
// calls), because sunos will let root unlink a directory, and some
// SUPER weird breakage happens as a result.

import { promises, rmdirSync, unlinkSync } from './fs.js'
const { rmdir, unlink } = promises

import { parse, resolve } from 'path'

import { readdirOrError, readdirOrErrorSync } from './readdir-or-error.js'

import { RimrafAsyncOptions, RimrafSyncOptions } from '.'
import { ignoreENOENT, ignoreENOENTSync } from './ignore-enoent.js'

export const rimrafPosix = async (
  path: string,
  opt: RimrafAsyncOptions
): Promise<boolean> => {
  if (opt?.signal?.aborted) {
    throw opt.signal.reason
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
    await ignoreENOENT(unlink(path))
    return true
  }

  const removedAll = (
    await Promise.all(
      entries.map(entry => rimrafPosix(resolve(path, entry), opt))
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

  if (opt.filter && !(await opt.filter(path))) {
    return false
  }

  await ignoreENOENT(rmdir(path))
  return true
}

export const rimrafPosixSync = (
  path: string,
  opt: RimrafSyncOptions
): boolean => {
  if (opt?.signal?.aborted) {
    throw opt.signal.reason
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
    ignoreENOENTSync(() => unlinkSync(path))
    return true
  }
  let removedAll: boolean = true
  for (const entry of entries) {
    removedAll = rimrafPosixSync(resolve(path, entry), opt) && removedAll
  }
  if (opt.preserveRoot === false && path === parse(path).root) {
    return false
  }

  if (!removedAll) {
    return false
  }

  if (opt.filter && !opt.filter(path)) {
    return false
  }

  ignoreENOENTSync(() => rmdirSync(path))
  return true
}
