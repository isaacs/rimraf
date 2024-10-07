import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '.tap/',
      'tap-snapshots/',
      'dist/',
      'benchmark/',
      'eslint.config.mjs',
      'map.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/test/**/*.ts'],
    rules: {
      'no-empty': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          minimumDescriptionLength: 0,
        },
      ],
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            'test',
            'rejects',
            'resolveMatch',
            'resolves',
          ].map(name => ({
            name,
            from: 'package',
            package: 'tap',
          })),
        },
      ],
    },
  },
)
