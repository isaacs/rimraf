// promisify ourselves, because older nodes don't have fs.promises

import fs from 'fs'

export type FsError = Error & {
  code?: string
  path?: string
}

// sync ones just take the sync version from node
export {
  chmodSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmdirSync,
  rmSync,
  statSync,
  unlinkSync,
} from 'fs'

// unrolled for better inlining, this seems to get better performance
// than something like:
// const makeCb = (res, rej) => (er, ...d) => er ? rej(er) : res(...d)
// which would be a bit cleaner.

const chmod = (path: fs.PathLike, mode: fs.Mode): Promise<void> =>
  new Promise((res, rej) =>
    fs.chmod(path, mode, (er, ...d: any[]) => (er ? rej(er) : res(...d)))
  )

const mkdir = (
  path: fs.PathLike,
  options?:
    | fs.Mode
    | (fs.MakeDirectoryOptions & { recursive?: boolean | null })
    | undefined
    | null
): Promise<string | undefined> =>
  new Promise((res, rej) =>
    fs.mkdir(path, options, (er, made) => (er ? rej(er) : res(made)))
  )

const readdir = (path: fs.PathLike): Promise<string[]> =>
  new Promise((res, rej) =>
    fs.readdir(path, (er, data) => (er ? rej(er) : res(data)))
  )

const rename = (oldPath: fs.PathLike, newPath: fs.PathLike): Promise<void> =>
  new Promise((res, rej) =>
    fs.rename(oldPath, newPath, (er, ...d: any[]) => (er ? rej(er) : res(...d)))
  )

const rm = (path: fs.PathLike, options: fs.RmOptions): Promise<void> =>
  new Promise((res, rej) =>
    fs.rm(path, options, (er, ...d: any[]) => (er ? rej(er) : res(...d)))
  )

const rmdir = (path: fs.PathLike): Promise<void> =>
  new Promise((res, rej) =>
    fs.rmdir(path, (er, ...d: any[]) => (er ? rej(er) : res(...d)))
  )

const stat = (path: fs.PathLike): Promise<fs.Stats> =>
  new Promise((res, rej) =>
    fs.stat(path, (er, data) => (er ? rej(er) : res(data)))
  )

const unlink = (path: fs.PathLike): Promise<void> =>
  new Promise((res, rej) =>
    fs.unlink(path, (er, ...d: any[]) => (er ? rej(er) : res(...d)))
  )

export const promises = {
  chmod,
  mkdir,
  readdir,
  rename,
  rm,
  rmdir,
  stat,
  unlink,
}
