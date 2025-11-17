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

### 4. Start Development Servers

**Option A: Run both services with Docker Compose**

```bash
docker-compose up
```

**Option B: Run services individually**

Terminal 1 (Engine):
```bash
cd engine
npm run dev
```

Terminal 2 (UI):
```bash
cd ui
npm run dev
```

## Project Structure

```
mailhooks/
├── engine/                    # SMTP webhook engine
│   ├── migrations/           # Database migrations
│   │   ├── init.js          # Migration runner
│   │   └── 001-create-tables.sql
│   ├── config.json          # Engine configuration
│   └── package.json
│
├── ui/                       # Web management interface
│   ├── src/
│   │   └── index.ts         # Main server file (Hono API + HTML)
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                     # Documentation
├── .env.example             # Environment template
├── docker-compose.yml       # Multi-service orchestration
├── LICENSE                  # MIT License
├── README.md               # User documentation
├── API.md                  # API reference
└── CONTRIBUTING.md         # This file
```

## Development Workflow

### Branching Strategy

- `main` - Stable production code
- `develop` - Integration branch for features
- `feature/your-feature-name` - Feature branches
- `fix/issue-description` - Bug fix branches

### Creating a Feature Branch

```bash
# Update your local repository
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Write your code following our [coding standards](#coding-standards)
2. Test your changes thoroughly
3. Commit your changes with clear, descriptive messages
4. Push to your fork
5. Create a pull request

## Coding Standards

### TypeScript/JavaScript

- **Style**: Follow [Prettier](https://prettier.io/) formatting (run `npm run format`)
- **Linting**: Fix all ESLint warnings (run `npm run lint`)
- **Type Safety**: Avoid `any` types when possible; define proper interfaces
- **Naming**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and interfaces
  - `UPPER_SNAKE_CASE` for constants

### Documentation

- **JSDoc**: Document all public functions, classes, and interfaces
- **Comments**: Add inline comments for complex logic
- **API Routes**: Document all endpoints with:
  - Route path and method
  - Request parameters and body
  - Response formats and status codes
  - Error cases

Example:

```typescript
/**
 * Creates a new email address in the system.
 *
 * @route POST /api/email-addresses
 * @body {string} email - Email address to add (required)
 * @body {string} [description] - Optional description
 * @returns {Object} 201 - Created email address object
 * @returns {Object} 400 - Validation error
 */
app.post('/api/email-addresses', async (c) => {
  // Implementation
});
```

### Database

- **Migrations**: All schema changes must include a migration file
- **Queries**: Use parameterized queries to prevent SQL injection
- **Naming**: Use `snake_case` for table and column names

### Git Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]

[optional footer]
```

Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: Add email validation to address creation endpoint

fix: Correct session expiration calculation in auth middleware

docs: Update API.md with new routing rules endpoints
```

## Testing

### Manual Testing

1. **UI Testing**:
   - Test all three tabs (Email Addresses, Webhooks, Routing Rules)
   - Verify CRUD operations work correctly
   - Check error handling and validation
   - Test logout and re-login flow

2. **API Testing**:
   ```bash
   # Login
   curl -X POST http://localhost:3000/api/login \
     -H "Content-Type: application/json" \
     -d '{"apiKey":"your-api-key"}'

   # Save the returned token
   TOKEN="returned-token-here"

   # List email addresses
   curl http://localhost:3000/api/email-addresses \
     -H "x-session-token: $TOKEN"
   ```

3. **SMTP Testing**:
   ```bash
   # Send a test email using swaks
   swaks --to webhook@yourdomain.com \
         --from test@example.com \
         --server localhost:2525 \
         --body "Test message"
   ```

### Automated Testing

Currently, Mail Hooks does not have automated tests. **We welcome contributions to add:**

- Unit tests for API endpoints
- Integration tests for database operations
- End-to-end tests for the UI
- SMTP functionality tests

Suggested frameworks:
- **Testing**: [Vitest](https://vitest.dev/) or [Jest](https://jestjs.io/)
- **E2E**: [Playwright](https://playwright.dev/)

## Submitting Changes

### Pull Request Process

1. **Update Documentation**: Ensure README.md, API.md, or other docs are updated if needed
2. **Test Thoroughly**: Verify your changes work as expected
3. **Commit**: Make clear, atomic commits following our commit message guidelines
4. **Push**: Push to your fork

```bash
git push origin feature/your-feature-name
```

5. **Create Pull Request**:
   - Go to the GitHub repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template with:
     - Description of changes
     - Related issue numbers (if applicable)
     - Screenshots (for UI changes)
     - Testing performed

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] All files have appropriate JSDoc comments
- [ ] No lint errors (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Functionality has been tested locally
- [ ] Documentation has been updated
- [ ] Commit messages follow Conventional Commits format
- [ ] PR description is clear and complete

### Code Review

- Be open to feedback and suggestions
- Respond to review comments in a timely manner
- Make requested changes in new commits (don't force push)
- Once approved, a maintainer will merge your PR

## Reporting Issues

### Bug Reports

When reporting bugs, include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the problem
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**:
   - OS and version
   - Node.js version
   - Docker version (if applicable)
   - Database (Neon, PostgreSQL version)
6. **Logs**: Relevant error messages or logs
7. **Screenshots**: If applicable

### Feature Requests

For new features, provide:

1. **Problem Statement**: What problem does this solve?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: Other approaches you've considered
4. **Use Cases**: Real-world scenarios where this would be helpful

### Security Issues

**Do not open public issues for security vulnerabilities.**

Instead, email security concerns to: [security contact - to be added]

## Development Tips

### Debugging

**UI Server:**
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev
```

**Engine:**
```bash
# Enable verbose SMTP logging
LOG_LEVEL=debug npm run dev
```

**Database Queries:**
```typescript
// Add logging to queries
const result = await pool.query('SELECT * FROM email_addresses');
console.log('Query result:', result.rows);
```

### Hot Reload

The UI uses `tsx watch` for automatic reloading on file changes. The engine requires manual restart after code changes.

### Docker Development

Rebuild containers after dependency changes:

```bash
docker-compose build
docker-compose up
```

View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f ui
docker-compose logs -f engine
```

### Common Issues

**Port already in use:**
```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

**Database connection errors:**
- Verify DATABASE_URL is correct
- Check network connectivity to database
- Ensure migrations have been run

**SMTP not receiving emails:**
- Verify DNS MX records point to your server
- Check firewall allows port 25 (or your SMTP_PORT)
- Ensure routing rules are configured correctly

## Questions?

- Check existing issues and discussions
- Review the [README.md](README.md) and [API.md](API.md)
- Open a new discussion for general questions
- Join our community channels [to be added]

## Thank You!

Your contributions help make Mail Hooks better for everyone. We appreciate your time and effort!
