import { assertRimrafOptions, RimrafOptions } from './index.js'
export default (opt: RimrafOptions = {}) => {
  assertRimrafOptions(opt)
  return opt
}
