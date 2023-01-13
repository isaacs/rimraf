#!/usr/bin/env bash

cat >dist/cjs/src/package.json <<!EOF
{
  "type": "commonjs"
}
!EOF

cat >dist/mjs/src/package.json <<!EOF
{
  "type": "module"
}
!EOF

chmod 0755 dist/cjs/src/bin.js
