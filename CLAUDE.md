# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Mailhooks is a minimal, self-hosted email forwarding system with webhook integration. It consists of two main services:
- **Engine**: SMTP server that receives emails and dispatches them to webhooks
- **UI**: Web interface and REST API for managing email addresses, webhooks, and routing rules

Technology stack: Node.js 18+, TypeScript (UI), JavaScript (Engine), PostgreSQL (Neon), Hono framework.

## Architecture Overview

### System Flow

```
Email Client → [SMTP Engine :25] → [Database Router] → [Webhook Queue] → [External Webhooks]
                                           ↓
                     [Web UI :3000 / REST API] ← Session Auth
                                           ↓
                        [PostgreSQL Database]
```

### Key Components

**Engine Service** (`engine/server.js`):
- Runs SMTP server listening on port 25
- Parses incoming emails using the `inbound-email` fork (learnwithcc/inbound-email)
- Loads routing rules from database every 30 seconds
- Dispatches emails to webhooks via `better-queue` with concurrency control (5 concurrent)
- Implements retry logic (max 3 attempts with exponential backoff)
- Graceful shutdown handling

**Web UI** (`ui/src/index.ts`):
- Single-file Hono application with embedded HTML, CSS, and client-side JavaScript
- No separate SPA framework (simplicity-first design)
- Session-based authentication (24-hour tokens)
- REST API endpoints for managing email addresses, webhooks, and routing rules
- Real-time UI updates via fetch calls

**Database Router** (`engine/services/databaseRouter.js`):
- Queries PostgreSQL for routing rules
- Converts database rows to WebhookRouter format
- Caches rules with 30-second refresh cycle

**Database Schema** (via `engine/migrations/001-create-tables.sql`):
- `email_addresses`: Email addresses to receive on
- `webhooks`: Webhook destination URLs and HTTP methods
- `routing_rules`: Maps email addresses to webhooks with optional constraints

## Development Setup

### Install Dependencies

```bash
# Install engine dependencies
cd engine
npm install

# Install UI dependencies
cd ../ui
npm install
```

### Environment Configuration

Create a `.env` file at project root with:
```bash
DATABASE_URL=postgresql://user:password@host/dbname
API_KEY=your-secret-key-for-ui-authentication
NODE_ENV=development
SMTP_PORT=25
UI_PORT=3000
LOG_LEVEL=debug
ATTACHMENT_STORAGE=memory
MAX_FILE_SIZE=5242880
```

See `.env.example` for all available options.

### Database Setup

```bash
cd engine
npm run migrate    # Runs migrations/init.js (loads SQL files sequentially)
```

Migrations are idempotent (use `CREATE TABLE IF NOT EXISTS`). New schema files should be added to `engine/migrations/` with numeric prefixes (e.g., `002-add-new-table.sql`).

### Running Services in Development

**Engine** (SMTP server):
```bash
cd engine
npm run dev        # Starts with LOG_LEVEL=debug
```

**UI** (Web interface):
```bash
cd ui
npm run dev        # Runs tsx watch mode on src/index.ts
```

Both services must be running for the system to work. Engine listens on port 25 (SMTP) and UI on port 3000 (HTTP).

## Building & Deployment

### UI Build Commands

```bash
npm run build      # Compiles TypeScript to dist/index.js
npm run lint       # Runs ESLint
npm run format     # Runs Prettier
npm start          # Runs compiled dist/index.js
```

### Engine Build Commands

```bash
npm start          # Runs migrations then starts SMTP server
npm run dev        # Direct execution with debug logging (skips migrations)
```

### Docker Deployment

The project includes `docker-compose.yml` orchestrating both services:

```bash
docker-compose up -d
```

Services:
- **engine**: Node.js 20 Alpine, runs migrations on startup via `entrypoint.sh`
- **ui**: Multi-stage build, optimized runtime image
- Both connected to `mailhooks` bridge network
- Resource limits: 0.5 CPU, 512MB memory each

For production deployment, see `COOLIFY-DEPLOYMENT.md` for step-by-step Coolify instructions and the `README.md` for comprehensive documentation.

## Code Architecture & Key Patterns

### Single-File UI Design

The UI is intentionally a single file (`ui/src/index.ts`) containing:
- Hono server setup and middleware
- REST API endpoints
- Embedded HTML with inline CSS and JavaScript
- Session authentication logic

This design prioritizes simplicity and eliminates dependency complexity. No component framework or build tooling beyond TypeScript compilation.

### Email Parsing & Routing

The engine uses a forked version of `kriiv/inbound-email` that:
- Parses SMTP messages into structured email objects
- Extracts headers, body, and attachments
- Routes emails based on database rules
- Supports multiple webhooks per email address

The fork is maintained at `learnwithcc/inbound-email` with customizations for this project's needs.

### Session Authentication

Sessions are stored in-memory (not persistent across restarts):
- 24-hour token lifetime
- Tokens stored in browser localStorage
- Validated on each request via middleware
- No database persistence (consider Redis for production)

### Queue & Retry Logic

The `better-queue` library manages webhook dispatch:
- Concurrent processing (default 5)
- Max 3 retry attempts per webhook
- Exponential backoff between retries
- Failed webhooks logged with detailed error info

## Important Files

- `engine/server.js` - SMTP server setup, webhook queue initialization
- `engine/services/databaseRouter.js` - Loads routing rules from database every 30 seconds
- `engine/migrations/001-create-tables.sql` - Database schema definition
- `ui/src/index.ts` - Single-file web UI and REST API
- `docker-compose.yml` - Service orchestration
- `README.md` - Comprehensive documentation
- `COOLIFY-DEPLOYMENT.md` - Production deployment guide

## Testing

**Current state**: No test framework is configured. All testing is manual via:
- Health checks defined in Docker Compose (netstat, curl)
- Local development testing with Postman or curl
- Logging output inspection

Potential test areas for future implementation:
- Email parsing and validation
- Routing rule matching logic
- Webhook dispatch with retries
- Session token validation
- REST API endpoint functionality
- Database schema migrations

## Common Development Tasks

### Adding a New API Endpoint

1. Add route handler in `ui/src/index.ts` (e.g., `app.post('/api/new-endpoint')`)
2. Include authentication middleware check
3. Parse request body and validate inputs
4. Interact with database using `pg` client
5. Return JSON response

### Creating a Database Migration

1. Create `engine/migrations/NNN-description.sql` (increment NNN number)
2. Write idempotent SQL (use `IF NOT EXISTS`, `IF EXISTS`)
3. Run `npm run migrate` to execute
4. Test with both fresh install and upgrade scenarios

### Testing Email Routing Locally

Use swaks or netcat to send test emails:
```bash
# Send test email
swaks --to your-email@example.com --from test@example.com --header "Subject: Test"

# Or use netcat
echo "Subject: Test\n\nBody" | nc localhost 25
```

Then check logs and webhook destinations to verify routing.

### Debugging SMTP Issues

Enable debug logging and inspect SMTP interactions:
```bash
LOG_LEVEL=debug npm run dev
```

Check `engine/logs/` for rotating daily logfiles. Look for parsing errors or routing mismatches.

## Security Considerations

**Current Design Notes**:
- SMTP is completely open (no AUTH, no allowlisting)
- API key is plaintext environment variable
- Session tokens stored in localStorage (XSS vulnerable)
- Webhook forwarding has no signature validation
- No input sanitization for email content
- HTTPS enforcement depends on reverse proxy

See `COOLIFY-DEPLOYMENT.md` security checklist for production hardening recommendations.

## Performance & Scalability

**Considerations**:
- Database router reloads all rules every 30 seconds (CPU-bound on large rulesets)
- In-memory sessions lost on restart (no persistence)
- Queue concurrency default is 5 (adjustable for throughput)
- PostgreSQL connection pooling not explicitly configured
- No rate limiting on API endpoints
- No request validation schema (Zod/Joi)

For high-volume deployments, consider:
- Implementing caching layer (Redis) for routing rules
- Adding persistent session storage
- Tuning queue concurrency parameters
- Adding comprehensive request validation

## Recent Changes

Check git log for context on recent updates:
```bash
git log --oneline -10
```

Common areas of recent work:
- Database router caching and 30-second refresh cycle
- SMTP server initialization and configuration
- Docker build optimizations
- Migration system improvements

## Deployment Notes

**Production Target**: Coolify on `vps-1`

Key environment variables for Coolify deployment:
```bash
DATABASE_URL=postgresql://...  # Neon serverless
API_KEY=secure-random-key
NODE_ENV=production
LOG_LEVEL=info
```

The `COOLIFY-DEPLOYMENT.md` file contains detailed step-by-step instructions for production setup including DNS configuration, monitoring, scaling, and troubleshooting.

## File Organization

```
mailhooks/
├── engine/              # SMTP server service
│   ├── server.js       # Main SMTP server
│   ├── services/       # Shared utilities (databaseRouter.js)
│   ├── migrations/     # Database schema (SQL files)
│   ├── logs/           # Daily rotating logfiles
│   └── package.json    # Dependencies
├── ui/                 # Web management interface
│   ├── src/
│   │   └── index.ts    # Single-file Hono app
│   ├── dist/           # Compiled output
│   └── package.json    # Dependencies
├── docker-compose.yml  # Service orchestration
├── README.md           # Comprehensive documentation
└── COOLIFY-DEPLOYMENT.md  # Production deployment guide
```
