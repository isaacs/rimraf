import fs, { Dirent } from 'fs'
import fsPromises from 'fs/promises';

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
  fs.readdirSync(path, { withFileTypes: true })

const readdir = (path: fs.PathLike): Promise<Dirent[]> =>
  fsPromises.readdir(path, { withFileTypes: true })

export const promises = {
  chmod: fsPromises.chmod,
  mkdir: fsPromises.mkdir,
  readdir,
  rename: fsPromises.rename,
  rm: fsPromises.rm,
  rmdir: fsPromises.rmdir,
  stat: fsPromises.stat,
  lstat: fsPromises.lstat,
  unlink: fsPromises.unlink,
}
