import { writeFile as writeFile_ } from 'fs'
const writeFile = async (path, data) =>
  new Promise((res, rej) =>
    writeFile_(path, data, er => (er ? rej(er) : res())),
  )
import { mkdirp } from 'mkdirp'
import { resolve } from 'path'

const create = async (path, start, end, maxDepth, depth = 0) => {
  await mkdirp(path)
  const promises = []
  for (let i = start; i <= end; i++) {
    const c = String.fromCharCode(i)
    if (depth < maxDepth && i - start >= depth)
      await create(resolve(path, c), start, end, maxDepth, depth + 1)
    else promises.push(writeFile(resolve(path, c), c))
  }
  await Promise.all(promises)
  return path
}

export default async ({ start, end, depth, name }) => {
  const path = resolve(import.meta.dirname, 'fixtures', name, 'test')
  return await create(path, start.charCodeAt(0), end.charCodeAt(0), depth)
}
