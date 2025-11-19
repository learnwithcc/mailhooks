# Contributing to Mail Hooks

Thank you for your interest in contributing to Mail Hooks! This guide will help you get started with development and explain our contribution process.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and considerate in all interactions
- Focus on constructive feedback
- Help others learn and grow
- Assume good intentions

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** - Required for both UI and engine
- **Docker & Docker Compose** - For containerized development
- **PostgreSQL** - We recommend using [Neon](https://neon.tech) for development
- **Git** - For version control

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/mailhooks.git
cd mailhooks
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/learnwithcc/mailhooks.git
```

## Development Setup

### 1. Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mailhooks

# Authentication
API_KEY=your-dev-api-key-here

# Ports
SMTP_PORT=2525  # Use non-privileged port for development
UI_PORT=3000

# Logging
LOG_LEVEL=debug
NODE_ENV=development
```

### 2. Install Dependencies

```bash
# Install UI dependencies
cd ui
npm install

# Install Engine dependencies
cd ../engine
npm install
```

### 3. Database Setup

Run migrations to create the database schema:

```bash
cd engine
npm run migrate
```

### 4. Start Services

In separate terminal windows:

```bash
# Terminal 1: Start the SMTP engine
cd engine
npm run dev

# Terminal 2: Start the web UI
cd ui
npm run dev
```

## Project Structure

```
mailhooks/
├── engine/              # SMTP server and email routing
│   ├── server.js       # SMTP server implementation
│   ├── services/       # Utility modules
│   ├── migrations/     # Database schema
│   ├── logs/           # Application logs
│   └── package.json
├── ui/                 # Web management interface
│   ├── src/
│   │   └── index.ts    # Single-file Hono application
│   ├── dist/           # Compiled output
│   └── package.json
├── docs/               # Documentation
├── docker-compose.yml  # Development environment
└── package.json
```

## Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** - Follow the coding standards below

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Format and lint your code**:
   ```bash
   npm run format
   npm run lint
   ```

5. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add new feature" -m "Description of changes"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a pull request** on GitHub with a clear description

## Coding Standards

### TypeScript

- Use **strict mode** - `"strict": true` in tsconfig.json
- Add **type annotations** for function parameters and return values
- Use **interfaces** for complex object shapes
- Avoid `any` - use generics or union types instead

### JavaScript

- Use **ES modules** - `import/export` syntax
- Use **async/await** - Avoid promise chains where possible
- Add **error handling** - Wrap async operations in try/catch

### Naming Conventions

- **Variables/Functions**: `camelCase`
- **Classes/Interfaces**: `PascalCase`
- **Constants**: `UPPER_CASE` (for module-level constants)
- **Files**: `kebab-case.js` or `kebab-case.ts`

### Comments & Documentation

- Use **JSDoc** for functions and classes
- Keep comments **concise** and **meaningful**
- Update comments when code changes

Example:
```typescript
/**
 * Validates an email address format
 * @param {string} email - The email to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidEmail(email: string): boolean {
  // implementation
}
```

### Code Organization

- Keep functions **small and focused** (< 50 lines ideally)
- One responsibility per module
- Export only public APIs
- Group related functions together

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Test **public APIs** and critical paths
- Use **descriptive test names**
- Follow the **Arrange-Act-Assert** pattern
- Mock **external dependencies**

Example:
```typescript
describe('validateEmail', () => {
  it('should return true for valid email addresses', () => {
    // Arrange
    const email = 'user@example.com';

    // Act
    const result = isValidEmail(email);

    // Assert
    expect(result).toBe(true);
  });
});
```

## Submitting Changes

### Pull Request Guidelines

- **Clear title**: Describe what the PR does in 50 characters or less
- **Description**: Explain the "why" not just the "what"
- **Linked issues**: Reference related issues using `#123`
- **Scope**: Keep PRs focused on a single feature or fix
- **Tests**: Include tests for new functionality
- **Documentation**: Update docs if behavior changes

### Review Process

1. **Automated checks** - Tests and linting must pass
2. **Code review** - At least one maintainer reviews
3. **Feedback** - Respond to comments and make requested changes
4. **Approval** - Merge once approved

## Reporting Issues

### Before Reporting

- Check **existing issues** to avoid duplicates
- Update to the **latest version** to verify the issue exists
- Try to **reproduce consistently** and document steps

### Issue Report Template

**Title**: Clear, descriptive summary

**Description**:
```
## Expected Behavior
What should happen?

## Actual Behavior
What actually happens?

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Environment
- Node.js version
- OS
- Relevant dependencies

## Logs / Screenshots
Any error messages or relevant output
```

## Questions?

- Check the [README.md](README.md) for project overview
- See [API.md](API.md) for API documentation
- Open an issue with the `question` label
- Reach out to maintainers on GitHub Discussions

Thank you for contributing! 🎉
