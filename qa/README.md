# QA Testing Framework

This directory contains the comprehensive Quality Assurance testing framework for the PVA Bazaar application.

## Structure

### `/apps` - Application-specific tests
- `api-tests/` - API integration, load, and security tests
- `contracts/` - Smart contract testing with Foundry
- `web-com/` - Component unit tests
- `web-org/` - End-to-end testing with Playwright

### `/qa` - Central QA utilities
- `accessibility/` - Cultural accessibility testing
- `ai-test-generator/` - AI-powered test generation
- `axe/` - Accessibility testing with axe-core
- `brand/` - Brand compliance validation
- `chaos/` - Chaos engineering tests
- `design-system/` - Design token validation
- `lighthouse/` - Performance testing
- `pa11y/` - Accessibility scanning
- `test-data/` - Test data builders and fixtures

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Run all tests:
```bash
npm run test:all
```

3. Run specific test suites:
```bash
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:security    # Security tests
npm run test:a11y        # Accessibility tests
npm run test:lighthouse  # Performance tests
```

4. QA utilities:
```bash
npm run qa:validate-tokens  # Validate design tokens
npm run qa:check-brand     # Brand compliance check
npm run qa:chaos           # Chaos engineering
npm run qa:axe             # Accessibility with axe
npm run qa:ai-generate     # AI test generation
```

## Configuration Files

- `eslint.config.mjs` - Code linting rules
- `prettier.config.cjs` - Code formatting rules
- `tsconfig.json` - TypeScript configuration
- `commitlint.config.cjs` - Commit message linting
- `playwright.config.ts` - E2E testing configuration
- `jest.setup.js` - Jest testing setup

## CI/CD Integration

The framework includes a comprehensive GitHub Actions workflow in `.github/workflows/quality-gates.yml` that runs:

- Code linting and formatting checks
- Unit and integration tests
- End-to-end tests across multiple browsers
- Security scanning
- Accessibility testing
- Performance testing with Lighthouse
- Smart contract testing

## Accessibility Testing

The framework includes multiple layers of accessibility testing:

- **axe-core** - Automated accessibility testing
- **pa11y** - Command-line accessibility testing
- **Cultural a11y** - Multi-language and cultural accessibility
- **Manual testing guidelines** - For human verification

## Performance Testing

Performance is validated through:

- **Lighthouse CI** - Core web vitals and performance metrics
- **Load testing** - API stress testing with Artillery
- **Visual regression** - Screenshot comparison testing
- **Memory/CPU stress** - Application resilience testing

## Security Testing

Security is ensured through:

- **Input validation** - XSS, SQL injection, and input sanitization
- **Authentication** - Token validation and session management
- **Rate limiting** - API abuse prevention
- **File upload** - Malicious file detection
- **Headers** - Security header validation

## Getting Started

1. Review the test examples in each directory
2. Run the existing tests to ensure setup is correct
3. Add new tests using the provided patterns and utilities
4. Use the AI test generator for initial test scaffolding
5. Integrate tests into your development workflow

## Best Practices

- Write tests before implementing features (TDD)
- Use the provided test data builders for consistent test data
- Run accessibility tests regularly, not just at the end
- Include performance budgets in your tests
- Test error conditions and edge cases
- Use chaos engineering to test resilience
- Keep tests maintainable and readable

## Support

For questions about the testing framework:
1. Check the examples in each directory
2. Review the configuration files
3. Look at the CI/CD workflow for integration patterns
4. Use the AI test generator for guidance on new tests