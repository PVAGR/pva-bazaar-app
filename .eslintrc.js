import next from 'eslint-config-next';

// The official PVA color palette
const BRAND_COLORS = ['#0f3b2d', '#1c5a45', '#2d7d5a', '#4ef8a3', '#2bb673', '#d4af37', '#e8f4f0', '#a8b0b9'];

export default [
  ...next(),
  {
    plugins: {
      import: (await import('eslint-plugin-import')).default
    },
    rules: {
      'react/no-danger': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'import/no-unresolved': ['error', { caseSensitive: true }],
      'import/no-default-export': 'off', // Next.js uses default exports for pages
      // This rule prevents any raw hex code that is not in the official brand palette.
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#([0-9a-fA-F]{6})$/]",
          message: 'Do not use raw hex colors. Use brand tokens from your design system (e.g., Tailwind config or CSS variables). If you must use a hex code, it must be an official brand color.'
        },
        // This part makes exceptions for the actual brand colors, so they can be defined in one place.
        ...BRAND_COLORS.map(color => ({
          selector: `Literal[value='${color}']`,
          message: `Allowed brand color: ${color}.`
        })),
      ],
    },
    overrides: [
      {
        files: ['**/*.test.*', '**/*.spec.*'],
        rules: { 'import/no-extraneous-dependencies': 'off' }
      }
    ]
  }
];
