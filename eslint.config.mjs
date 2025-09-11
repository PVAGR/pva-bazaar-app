import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
    },
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.min.js',
      'public/**',
    ],
  },
  {
    files: ['**/*.test.js', '**/*.spec.js', '**/test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.mocha,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
];