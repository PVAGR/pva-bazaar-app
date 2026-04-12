# Contributing to PVA Bazaar

Thank you for your interest in contributing to PVA Bazaar! We appreciate your help in making this project better.

## Open-Source Release Workflow

Thank you for helping build the frontier of direct democracy.

### Getting Started
1. Fork the repo.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Run `npm install` in root and `Frontend/`.
4. Start dev servers with `npm run dev`.
5. Submit a PR with clear description and test coverage.

### Code Standards
- Follow existing patterns in governance components.
- Use CSS variables for theming: `var(--site-*)`.
- Add eslint-disable only with justification.
- Write tests for new logic in `Frontend/src/__tests__/`.

### Kenya Pilot Contributions
If contributing features for Kenya deployment:
- Add Swahili translations to localization maps.
- Test offline behavior with browser offline mode.
- Ensure Proof-of-Personhood component works on low-end Android devices.

## Code of Conduct

- Be respectful and inclusive
- No harassment, discrimination, or offensive behavior
- Focus on constructive feedback
- Respect different viewpoints and experiences

## How to Contribute

### Reporting Bugs

1. **Check existing issues** - Make sure it hasn't been reported already
2. **Use bug report template** - Click "New Issue" → "Bug Report"
3. **Provide details:**
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/error messages
   - Environment info (OS, browser, versions)

### Suggesting Features

1. **Check discussions** - Avoid duplicates
2. **Use feature request template** - Click "New Issue" → "Feature Request"
3. **Explain:**
   - What problem does this solve?
   - How should it work?
   - Alternative approaches you considered

### Submitting Code Changes

#### Prerequisites
- Node.js 20.x
- npm 10.x
- Git
- GitHub account

#### Setup Development Environment

```bash
# Fork the repository (GitHub UI)
# Clone your fork
git clone https://github.com/YOUR_USERNAME/pva-bazaar-app.git
cd pva-bazaar-app

# Add upstream remote
git remote add upstream https://github.com/PVAGR/pva-bazaar-app.git

# Install dependencies
npm install
npm run dev
```

#### Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix-name
   ```

2. **Make your changes:**
   - Follow the code style (Prettier will auto-format)
   - Write descriptive comments
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes:**
   ```bash
   npm run lint          # Check linting
   npm run format        # Format code
   npm run test          # Run tests (when available)
   npm run build         # Test build
   ```

4. **Commit with clear messages:**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```
   
   **Commit format:**
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation
   - `style:` - Formatting
   - `refactor:` - Code restructuring
   - `test:` - Tests
   - `chore:` - Maintenance

5. **Keep your branch updated:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

#### Creating a Pull Request

1. **Go to GitHub** - You'll see a prompt to create a PR
2. **Use the PR template** - Fill in all sections
3. **Link related issues** - Use `Fixes #123`
4. **Wait for review** - A maintainer will review your changes
5. **Address feedback** - Make requested changes and push
6. **Celebrate!** - Your PR gets merged 🎉

### Code Style Guidelines

#### JavaScript/TypeScript
```javascript
// Use 2-space indentation
function example() {
  const x = 1;
  return x;
}

// Use const/let, not var
const immutable = "value";
let mutable = "value";

// Use arrow functions
const add = (a, b) => a + b;

// Use template literals
const message = `Hello, ${name}!`;
```

#### React Components
```javascript
// Use functional components
function MyComponent({ prop1, prop2 }) {
  return (
    <div>
      <h1>{prop1}</h1>
      <p>{prop2}</p>
    </div>
  );
}

// Export at the end
export default MyComponent;
```

#### Comments
```javascript
// Single line comments for brief notes
// Use this for explaining the "why", not the "what"

/**
 * Multi-line comments for functions and complex logic
 * @param {string} name - The user's name
 * @returns {string} Greeting message
 */
function greet(name) {
  return `Hello, ${name}!`;
}
```

### Git Workflow

```
1. Create feature branch from main
2. Make changes and commit
3. Push to your fork
4. Create PR against main
5. Address review feedback
6. Merge to main
7. Delete feature branch
```

### Testing

#### Running Tests
```bash
npm run test              # Run all tests
npm run test:ci           # Run tests in CI mode
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

#### Writing Tests
- Put test files next to source files
- Use `.test.js` or `.spec.js` extensions
- Test behavior, not implementation
- Aim for >80% coverage

### Documentation

- Update README.md for major changes
- Add JSDoc comments for functions
- Update CHANGELOG.md
- Include examples for new features
- Keep it clear and concise

### Pull Request Review Process

**What reviewers check:**
1. ✅ Code quality and style
2. ✅ Does it solve the issue?
3. ✅ Tests pass and coverage maintained
4. ✅ Documentation updated
5. ✅ No breaking changes
6. ✅ Performance impact considered
7. ✅ Security implications reviewed

**Reviewer response time:** Usually 2-7 days

### Merge Criteria

Your PR will be merged when:
- ✅ All tests pass
- ✅ No conflicts with main branch
- ✅ Approved by at least one maintainer
- ✅ All feedback addressed

## Development Workflow

### Backend Changes

```bash
cd backend
npm install        # If dependencies changed
npm run dev        # Start dev server
npm run build      # Test production build
npm run lint       # Check code quality
```

**Backend File Structure:**
- `routes/` - API endpoints
- `models/` - MongoDB schemas
- `middleware/` - Express middleware
- `lib/` - Utilities and services

### Frontend Changes

```bash
cd Frontend
npm install        # If dependencies changed
npm run dev        # Start dev server
npm run build      # Test production build
npm run lint       # Check code quality
```

**Frontend File Structure:**
- `src/components/` - Reusable components
- `src/pages/` - Page components
- `src/lib/` - Utilities
- `src/config/` - Configuration

### Database Changes

- Update MongoDB schemas in `backend/models/`
- Create migration scripts if needed
- Update documentation

## Getting Help

### Resources
- **Documentation:** Check `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Architecture:** See `INTEGRATION_GUIDE.md`
- **Troubleshooting:** Read `TROUBLESHOOTING_PERFORMANCE.md`
- **API Docs:** Check `backend/routes/` comments

### Communication
- **Questions:** Use GitHub Discussions
- **Bugs:** Open an issue with bug template
- **Ideas:** Open an issue with feature template
- **Security:** See SECURITY.md

## Contributor Recognition

We value all contributions! Contributors will be:
- Listed in the project
- Credited in release notes
- Invited to GitHub team (if active)

## Legal

By contributing, you agree to:
- Your contributions are under the MIT license
- You have the right to contribute the code
- You won't include proprietary or restricted content

## Questions?

Feel free to:
- 📖 Check the documentation
- 💬 Use GitHub Discussions
- 🐛 Open an issue
- 📧 Contact maintainers

---

**Thank you for contributing! Your help makes PVA Bazaar better! 🙏**
