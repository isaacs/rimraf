import { assertRimrafOptions, RimrafOptions } from './index'
export default (opt: RimrafOptions = {}) => {
  assertRimrafOptions(opt)
  return opt
}
