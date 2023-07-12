import fs, { Dirent, readdirSync as rdSync } from 'fs'
import fsPromises from 'fs/promises'

// sync ones just take the sync version from node
// readdir forces withFileTypes: true

export {
  chmodSync,
  mkdirSync,
  renameSync,
  rmdirSync,
  rmSync,
  statSync,
  lstatSync,
  unlinkSync,
} from 'fs'

export const readdirSync = (path: fs.PathLike): Dirent[] =>
  rdSync(path, { withFileTypes: true })

export const promises = {
  chmod: fsPromises.chmod,
  mkdir: fsPromises.mkdir,
  readdir: (path: fs.PathLike) =>
    fsPromises.readdir(path, { withFileTypes: true }),
  rename: fsPromises.rename,
  rm: fsPromises.rm,
  rmdir: fsPromises.rmdir,
  stat: fsPromises.stat,
  lstat: fsPromises.lstat,
  unlink: fsPromises.unlink,
}
