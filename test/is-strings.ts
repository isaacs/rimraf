import t from 'tap'

import { isStrings } from '../src/is-strings.js'

t.equal(isStrings('asdf'), true)
t.equal(isStrings('asdf'.split('')), true)
t.equal(isStrings([]), true)
//@ts-expect-error
t.equal(isStrings([{x:1}]), false)
//@ts-expect-error
t.equal(isStrings({x:1}), false)
