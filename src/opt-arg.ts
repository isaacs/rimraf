import { Dirent, Stats } from 'fs'
import { GlobOptions } from 'glob'

const typeOrUndef = (val: unknown, t: string) =>
  typeof val === 'undefined' || typeof val === t

const isRecord = (o: unknown): o is Record<string, unknown> =>
  !!o && typeof o === 'object'

export const isRimrafOptions = (o: unknown): o is RimrafOptions =>
  isRecord(o) &&
  typeOrUndef(o.preserveRoot, 'boolean') &&
  typeOrUndef(o.tmp, 'string') &&
  typeOrUndef(o.maxRetries, 'number') &&
  typeOrUndef(o.retryDelay, 'number') &&
  typeOrUndef(o.backoff, 'number') &&
  typeOrUndef(o.maxBackoff, 'number') &&
  (typeOrUndef(o.glob, 'boolean') || isRecord(o.glob)) &&
  typeOrUndef(o.filter, 'function')

export const assertRimrafOptions: (o: unknown) => void = (
  o: unknown,
): asserts o is RimrafOptions => {
  if (!isRimrafOptions(o)) {
    throw new Error('invalid rimraf options')
  }
}

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

const optArgT = <T extends RimrafOptions>(
  opt: T,
):
  | (T & {
      glob: GlobOptions & { withFileTypes: false }
    })
  | (T & { glob: undefined }) => {
  assertRimrafOptions(opt)
  const { glob, ...options } = opt
  if (!glob) {
    return options as T & { glob: undefined }
  }
  const globOpt =
    glob === true ?
      opt.signal ?
        { signal: opt.signal }
      : {}
    : opt.signal ?
      {
        signal: opt.signal,
        ...glob,
      }
    : glob
  return {
    ...options,
    glob: {
      ...globOpt,
      // always get absolute paths from glob, to ensure
      // that we are referencing the correct thing.
      absolute: true,
      withFileTypes: false,
    },
  } as T & { glob: GlobOptions & { withFileTypes: false } }
}

export const optArg = (opt: RimrafAsyncOptions = {}) => optArgT(opt)
export const optArgSync = (opt: RimrafSyncOptions = {}) => optArgT(opt)
