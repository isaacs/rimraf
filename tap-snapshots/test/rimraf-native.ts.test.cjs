/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/rimraf-native.ts > TAP > calls the right node function > must match snapshot 1`] = `
Array [
  Array [
    "rm",
    "path",
    Object {
      "force": true,
      "recursive": true,
      "x": "y",
    },
  ],
  Array [
    "rmSync",
    "path",
    Object {
      "a": "b",
      "force": true,
      "recursive": true,
    },
  ],
]
`
