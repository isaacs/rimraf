import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  entry: 'bin-without-hashbang.js', // entry point for the application
  dest: 'rimraf-standalone.js',
  useStrict: false,
  format: 'cjs',
  external: [
    'assert',
    'events',
    'fs',
    'path',
    'util'
  ],
  plugins: [
    nodeResolve(),
    commonjs({
      include: [
      ]
    })
  ]
}
