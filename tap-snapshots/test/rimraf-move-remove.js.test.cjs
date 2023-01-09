/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/rimraf-move-remove.js TAP handle EPERMs on unlink by trying to chmod 0o666 async > must match snapshot 1`] = `
Array [
  Array [
    "chmod",
    "{tmpfile}",
    "438",
  ],
]
`

exports[`test/rimraf-move-remove.js TAP handle EPERMs on unlink by trying to chmod 0o666 sync > must match snapshot 1`] = `
Array [
  Array [
    "chmodSync",
    "{tmpfile}",
    "438",
  ],
]
`

exports[`test/rimraf-move-remove.js TAP handle EPERMs, chmod raises something other than ENOENT async > must match snapshot 1`] = `
Array []
`

exports[`test/rimraf-move-remove.js TAP handle EPERMs, chmod raises something other than ENOENT sync > must match snapshot 1`] = `
Array [
  Array [
    "chmodSync",
    "{tmpfile}",
    "438",
  ],
]
`

exports[`test/rimraf-move-remove.js TAP handle EPERMs, chmod returns ENOENT async > must match snapshot 1`] = `
Array [
  Array [
    "chmod",
    "{tmpfile}",
    "438",
  ],
]
`

exports[`test/rimraf-move-remove.js TAP handle EPERMs, chmod returns ENOENT sync > must match snapshot 1`] = `
Array [
  Array [
    "chmodSync",
    "{tmpfile}",
    "438",
  ],
]
`
