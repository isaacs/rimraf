// promisify ourselves, because older nodes don't have fs.promises

const fs = require('fs')

// sync ones just take the sync version from node
const {
  chmodSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} = fs

// unrolled for better inlining, this seems to get better performance
// than something like:
// const makeCb = (res, rej) => (er, ...d) => er ? rej(er) : res(...d)
// which would be a bit cleaner.

const chmod = (...args) => new Promise((res, rej) =>
  fs.chmod(...(args.concat((er, ...data) => er ? rej(er) : res(...data)))))

const mkdir = (...args) => new Promise((res, rej) =>
  fs.mkdir(...(args.concat((er, ...data) => er ? rej(er) : res(...data)))))

const readdir = (...args) => new Promise((res, rej) =>
  fs.readdir(...(args.concat((er, ...data) => er ? rej(er) : res(...data)))))

const rename = (...args) => new Promise((res, rej) =>
  fs.rename(...(args.concat((er, ...data) => er ? rej(er) : res(...data)))))

const rm = (...args) => new Promise((res, rej) =>
  fs.rm(...(args.concat((er, ...data) => er ? rej(er) : res(...data)))))

const rmdir = (...args) => new Promise((res, rej) =>
  fs.rmdir(...(args.concat((er, ...data) => er ? rej(er) : res(...data)))))

const stat = (...args) => new Promise((res, rej) =>
  fs.stat(...(args.concat((er, ...data) => er ? rej(er) : res(...data)))))

const unlink = (...args) => new Promise((res, rej) =>
  fs.unlink(...(args.concat((er, ...data) => er ? rej(er) : res(...data)))))

const writeFile = (...args) => new Promise((res, rej) =>
  fs.writeFile(...(args.concat((er, ...data) => er ? rej(er) : res(...data)))))

module.exports = {
  chmodSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
  promises: {
    chmod,
    mkdir,
    readdir,
    rename,
    rm,
    rmdir,
    stat,
    unlink,
    writeFile,
  },
}
