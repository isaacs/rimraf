import { PathLike } from './path-arg.js'

export const isStrings = (
  p: PathLike | PathLike[],
): p is string | string[] => {
  if (typeof p === 'string') return true
  if (!Array.isArray(p)) return false
  for (const s of p) {
    if (typeof s !== 'string') {
      return false
    }
  }
  return true
}
