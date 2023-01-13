import optArg from './opt-arg.js'
import pathArg from './path-arg.js'

export interface RimrafOptions {
  preserveRoot?: boolean
  tmp?: string
  maxRetries?: number
  retryDelay?: number
  backoff?: number
  maxBackoff?: number
}

/* c8 ignore start */
const typeOrUndef = (val: any, t: string) =>
  typeof val === 'undefined' || typeof val === t
/* c8 ignore stop */

export const isRimrafOptions = (o: any): o is RimrafOptions =>
  !!o &&
  typeof o === 'object' &&
  typeOrUndef(o.preserveRoot, 'boolean') &&
  typeOrUndef(o.preserveRoot, 'number') &&
  typeOrUndef(o.maxRetries, 'number') &&
  typeOrUndef(o.retryDelay, 'number') &&
  typeOrUndef(o.backoff, 'number') &&
  typeOrUndef(o.maxBackoff, 'number')

/* c8 ignore start */
export const assertRimrafOptions: (o: any) => void = (
  o: any
): asserts o is RimrafOptions => {
  if (!isRimrafOptions(o)) {
    throw new Error('invalid rimraf options')
  }
}
/* c8 ignore stop */

import { rimrafManual, rimrafManualSync } from './rimraf-manual.js'
import { rimrafMoveRemove, rimrafMoveRemoveSync } from './rimraf-move-remove.js'
import { rimrafNative, rimrafNativeSync } from './rimraf-native.js'
import { rimrafPosix, rimrafPosixSync } from './rimraf-posix.js'
import { rimrafWindows, rimrafWindowsSync } from './rimraf-windows.js'
import { useNative, useNativeSync } from './use-native.js'

const wrap =
  (fn: (p: string, o: RimrafOptions) => Promise<void>) =>
  async (path: string | string[], opt?: RimrafOptions): Promise<void> => {
    const options: RimrafOptions = optArg(opt)
    await (Array.isArray(path)
      ? Promise.all(path.map(p => fn(pathArg(p, options), options)))
      : fn(pathArg(path, options), options))
  }

const wrapSync =
  (fn: (p: string, o: RimrafOptions) => void) =>
  (path: string | string[], opt?: RimrafOptions): void => {
    const options = optArg(opt)
    return Array.isArray(path)
      ? path.forEach(p => fn(pathArg(p, options), options))
      : fn(pathArg(path, options), options)
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
  useNativeSync() ? rimrafNativeSync(path, opt) : rimrafManualSync(path, opt)
)
export const sync = rimrafSync

export const rimraf = Object.assign(
  wrap((path, opt) =>
    useNative() ? rimrafNative(path, opt) : rimrafManual(path, opt)
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
