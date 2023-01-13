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

import { RimrafOptions } from '.'
import { ignoreENOENT, ignoreENOENTSync } from './ignore-enoent.js'

export const rimrafPosix = async (path: string, opt: RimrafOptions) => {
  const entries = await readdirOrError(path)
  if (!Array.isArray(entries)) {
    if (entries.code === 'ENOENT') {
      return
    }
    if (entries.code !== 'ENOTDIR') {
      throw entries
    }
    return ignoreENOENT(unlink(path))
  }
  await Promise.all(
    entries.map(entry => rimrafPosix(resolve(path, entry), opt))
  )

  // we don't ever ACTUALLY try to unlink /, because that can never work
  // but when preserveRoot is false, we could be operating on it.
  // No need to check if preserveRoot is not false.
  if (opt.preserveRoot === false && path === parse(path).root) {
    return
  }

  return ignoreENOENT(rmdir(path))
}

export const rimrafPosixSync = (path: string, opt: RimrafOptions) => {
  const entries = readdirOrErrorSync(path)
  if (!Array.isArray(entries)) {
    if (entries.code === 'ENOENT') {
      return
    }
    if (entries.code !== 'ENOTDIR') {
      throw entries
    }
    return ignoreENOENTSync(() => unlinkSync(path))
  }
  for (const entry of entries) {
    rimrafPosixSync(resolve(path, entry), opt)
  }

  if (opt.preserveRoot === false && path === parse(path).root) {
    return
  }

  return ignoreENOENTSync(() => rmdirSync(path))
}
