import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
  import: importPlugin,
    },
    rules: {
      // TypeScript rules
  '@typescript-eslint/no-unused-vars': 'error',
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      
      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // Accessibility rules
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      
      // Security rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      
      // PVA-specific rules
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value='#ff0000']",
          message: 'Use PVA brand colors only. Avoid red (#ff0000).',
        },
        {
          selector: "Literal[value='#0000ff']", 
          message: 'Use PVA brand colors only. Avoid blue (#0000ff).',
        },
        {
          selector: "Literal[value='#ffff00']",
          message: 'Use PVA brand colors only. Avoid yellow (#ffff00).',
        },
        {
          selector: "CallExpression[callee.name='console'][arguments.0.value=/password|secret|key|token/i]",
          message: 'Do not log sensitive information.',
        },
      ],
      
      // Code quality
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      
  // Import rules
  'import/no-unresolved': ['error', { caseSensitive: true }],
      'import/no-default-export': 'off', // Next.js uses default exports
      'import/prefer-default-export': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}'],
    rules: {
      // Allow more flexible rules in tests
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['apps/contracts/**/*.sol'],
    rules: {
      // Disable JS/TS rules for Solidity files
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '.next/',
      'out/',
      'coverage/',
      '*.min.js',
      'qa/reports/',
      'qa/backstop/bitmaps_*/',
    ],
  },
];
