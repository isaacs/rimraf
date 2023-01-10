// note: max backoff is the maximum that any *single* backoff will do
//
const MAXBACKOFF = 200
const RATE = 1.2
const MAXRETRIES = 10

const codes = new Set(['EMFILE', 'ENFILE', 'EBUSY'])
const retryBusy = fn => {
  const method = async (path, opt, backoff = 1, total = 0) => {
    const mbo = opt.maxBackoff || MAXBACKOFF
    const rate = opt.backoff || RATE
    const max = opt.retries || MAXRETRIES
    let retries = 0
    while (true) {
      try {
        return await fn(path)
      } catch (er) {
        if (codes.has(er.code)) {
          backoff = Math.ceil(backoff * rate)
          total = backoff + total
          if (total < mbo) {
            return new Promise((res, rej) => {
              setTimeout(() => {
                method(path, opt, backoff, total).then(res, rej)
              }, backoff)
            })
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
const retryBusySync = fn => {
  const method = (path, opt) => {
    const max = opt.retries || MAXRETRIES
    let retries = 0
    while (true) {
      try {
        return fn(path)
      } catch (er) {
        if (codes.has(er.code) && retries < max) {
          retries++
          continue
        }
        throw er
      }
    }
  }
  return method
}

module.exports = {
  MAXBACKOFF,
  RATE,
  MAXRETRIES,
  codes,
  retryBusy,
  retryBusySync,
}
