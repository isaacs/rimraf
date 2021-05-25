const { writeFile: writeFile_ } = require('fs')
const writeFile = async (path, data) => new Promise((res, rej) =>
  writeFile_(path, data, er => er ? rej(er) : res()))
const mkdirp = require('mkdirp')
const { resolve } = require('path')

const create = async (path, start, end, maxDepth, depth = 0) => {
  await mkdirp(path)
  const promises = []
  for (let i = start; i <= end; i++) {
    const c = String.fromCharCode(i)
    if (depth < maxDepth && (i-start >= depth))
      await create(resolve(path, c), start, end, maxDepth, depth + 1)
    else
      promises.push(writeFile(resolve(path, c), c))
  }
  await Promise.all(promises)
  return path
}

module.exports = async ({ start, end, depth, name }) => {
  const path = resolve(__dirname, 'fixtures', name, 'test')
  return await create(path, start.charCodeAt(0), end.charCodeAt(0), depth)
}
