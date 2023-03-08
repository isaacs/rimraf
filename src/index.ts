import { optArg, optArgSync } from './opt-arg.js'
import pathArg from './path-arg.js'

import { glob, GlobOptions, globSync } from 'glob'

export interface RimrafAsyncOptions {
  preserveRoot?: boolean
  tmp?: string
  maxRetries?: number
  retryDelay?: number
  backoff?: number
  maxBackoff?: number
  signal?: AbortSignal
  glob?: boolean | GlobOptions
  filter?:
    | ((path: string, ent: Dirent | Stats) => boolean)
    | ((path: string, ent: Dirent | Stats) => Promise<boolean>)
}

export interface RimrafSyncOptions extends RimrafAsyncOptions {
  filter?: (path: string, ent: Dirent | Stats) => boolean
}

export type RimrafOptions = RimrafSyncOptions | RimrafAsyncOptions

const typeOrUndef = (val: any, t: string) =>
  typeof val === 'undefined' || typeof val === t

export const isRimrafOptions = (o: any): o is RimrafOptions =>
  !!o &&
  typeof o === 'object' &&
  typeOrUndef(o.preserveRoot, 'boolean') &&
  typeOrUndef(o.tmp, 'string') &&
  typeOrUndef(o.maxRetries, 'number') &&
  typeOrUndef(o.retryDelay, 'number') &&
  typeOrUndef(o.backoff, 'number') &&
  typeOrUndef(o.maxBackoff, 'number') &&
  (typeOrUndef(o.glob, 'boolean') || (o.glob && typeof o.glob === 'object')) &&
  typeOrUndef(o.filter, 'function')

export const assertRimrafOptions: (o: any) => void = (
  o: any
): asserts o is RimrafOptions => {
  if (!isRimrafOptions(o)) {
    throw new Error('invalid rimraf options')
  }
}

import { Dirent, Stats } from 'fs'
import { rimrafManual, rimrafManualSync } from './rimraf-manual.js'
import { rimrafMoveRemove, rimrafMoveRemoveSync } from './rimraf-move-remove.js'
import { rimrafNative, rimrafNativeSync } from './rimraf-native.js'
import { rimrafPosix, rimrafPosixSync } from './rimraf-posix.js'
import { rimrafWindows, rimrafWindowsSync } from './rimraf-windows.js'
import { useNative, useNativeSync } from './use-native.js'

const wrap =
  (fn: (p: string, o: RimrafAsyncOptions) => Promise<boolean>) =>
  async (
    path: string | string[],
    opt?: RimrafAsyncOptions
  ): Promise<boolean> => {
    const options = optArg(opt)
    if (options.glob) {
      path = await glob(path, options.glob)
    }
    if (Array.isArray(path)) {
      return !!(
        await Promise.all(path.map(p => fn(pathArg(p, options), options)))
      ).reduce((a, b) => a && b, true)
    } else {
      return !!(await fn(pathArg(path, options), options))
    }
  }

const wrapSync =
  (fn: (p: string, o: RimrafSyncOptions) => boolean) =>
  (path: string | string[], opt?: RimrafSyncOptions): boolean => {
    const options = optArgSync(opt)
    if (options.glob) {
      path = globSync(path, options.glob)
    }
    if (Array.isArray(path)) {
      return !!path
        .map(p => fn(pathArg(p, options), options))
        .reduce((a, b) => a && b, true)
    } else {
      return !!fn(pathArg(path, options), options)
    }
  }

export const nativeSync = wrapSync(rimrafNativeSync)
export const native = Object.assign(wrap(rimrafNative), { sync: nativeSync })

export const manualSync = wrapSync(rimrafManualSync)
export const manual = Object.assign(wrap(rimrafManual), { sync: manualSync })

export const windowsSync = wrapSync(rimrafWindowsSync)
export const windows = Object.assign(wrap(rimrafWindows), { sync: windowsSync })

export const posixSync = wrapSync(rimrafPosixSync)
export const posix = Object.assign(wrap(rimrafPosix), { sync: posixSync })

export const moveRemoveSync = wrapSync(rimrafMoveRemoveSync)
export const moveRemove = Object.assign(wrap(rimrafMoveRemove), {
  sync: moveRemoveSync,
})

export const rimrafSync = wrapSync((path, opt) =>
  useNativeSync(opt) ? rimrafNativeSync(path, opt) : rimrafManualSync(path, opt)
)
export const sync = rimrafSync

export const rimraf = Object.assign(
  wrap((path, opt) =>
    useNative(opt) ? rimrafNative(path, opt) : rimrafManual(path, opt)
  ),
  {
    // this weirdness because it's easier than explicitly declaring
    rimraf: manual,
    sync: rimrafSync,
    rimrafSync: rimrafSync,
    manual,
    manualSync,
    native,
    nativeSync,
    posix,
    posixSync,
    windows,
    windowsSync,
    moveRemove,
    moveRemoveSync,
  }
)
rimraf.rimraf = rimraf

export default rimraf
