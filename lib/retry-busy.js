const MAXBACKOFF = 100
const RATE = 1.2
const MAXRETRIES = 10

const codes = new Set(['EMFILE', 'ENFILE', 'EBUSY'])
const retryBusy = fn => {
  const method = async (path, opt, backoff = 1) => {
    const mbo = opt.maxBackoff || MAXBACKOFF
    const rate = Math.max(opt.backoff || RATE, RATE)
    const max = opt.retries || MAXRETRIES
    let retries = 0
    while (true) {
      try {
        return await fn(path)
      } catch (er) {
        if (codes.has(er.code)) {
          backoff = Math.ceil(backoff * rate)
          if (backoff < mbo) {
            return new Promise((res, rej) => {
              setTimeout(() => {
                method(path, opt, backoff).then(res, rej)
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
  retryBusy,
  retryBusySync,
}
