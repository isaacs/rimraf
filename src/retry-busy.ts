// note: max backoff is the maximum that any *single* backoff will do

import { RimrafAsyncOptions, RimrafOptions } from './index.js'
import { isFsError } from './error.js'

export const MAXBACKOFF = 200
export const RATE = 1.2
export const MAXRETRIES = 10
export const codes = new Set(['EMFILE', 'ENFILE', 'EBUSY'])

export const retryBusy = <T>(fn: (path: string) => Promise<T>) => {
  const method = async (
    path: string,
    opt: RimrafAsyncOptions,
    backoff = 1,
    total = 0,
  ) => {
    const mbo = opt.maxBackoff || MAXBACKOFF
    const rate = opt.backoff || RATE
    const max = opt.maxRetries || MAXRETRIES
    let retries = 0
    while (true) {
      try {
        return await fn(path)
      } catch (er) {
        if (isFsError(er) && er.path === path && codes.has(er.code)) {
          backoff = Math.ceil(backoff * rate)
          total = backoff + total
          if (total < mbo) {
            await setTimeout(backoff)
            return method(path, opt, backoff, total)
          }
          if (retries < max) {
            retries++
            continue
          }
        }
        throw er
      }
    }
  }

  return method
}

// just retries, no async so no backoff
export const retryBusySync = <T>(fn: (path: string) => T) => {
  const method = (path: string, opt: RimrafOptions) => {
    const max = opt.maxRetries || MAXRETRIES
    let retries = 0
    while (true) {
      try {
        return fn(path)
      } catch (er) {
        if (
          isFsError(er) &&
          er.path === path &&
          codes.has(er.code) &&
          retries < max
        ) {
          retries++
          continue
        }
        throw er
      }
    }
  }
  return method
}
