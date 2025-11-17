# Mail Hooks – Email Forwarding System

Ultra-minimal, reusable email webhook management system. Receive emails on your own SMTP server and forward them to any webhook endpoint. Built for multiple projects with zero operational overhead.

## Features

✅ **Self-Hosted SMTP Server** - Full control, zero recurring costs
✅ **Webhook Forwarding** - Forward emails to any HTTP endpoint
✅ **Multi-Project Ready** - Manage email addresses and webhooks across projects
✅ **Ultra-Minimal UI** - Fast, responsive web interface (no heavy frameworks)
✅ **API Key Authentication** - Simple, secure access control
✅ **Docker Deployment** - Single `docker-compose up` to deploy both services
✅ **Neon Database** - Serverless PostgreSQL for zero-ops database management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mail Hooks System                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  engine/                                ui/                   │
│  ├─ SMTP Server (port 25)              ├─ Hono API Server   │
│  ├─ Email Router                        ├─ Web Interface     │
│  └─ Webhook Forwarder                   └─ Configuration     │
│         ↓                                      ↑              │
│  [Neon PostgreSQL Database]                                  │
│  ├─ Email Addresses                                          │
│  ├─ Webhook Destinations                                     │
│  └─ Routing Rules                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
mailhooks/
├── engine/                     # SMTP webhook engine
│   ├── migrations/            # Database schema
│   ├── config.json           # Engine configuration
│   ├── Dockerfile            # Engine container
│   ├── entrypoint.sh         # Startup script
│   └── package.json          # Dependencies
│
├── ui/                        # Web management interface
│   ├── src/
│   │   └── index.ts          # Hono API + HTML
│   ├── Dockerfile            # UI container
│   ├── package.json          # Dependencies
│   └── tsconfig.json         # TypeScript config
│
├── docs/                      # Shared documentation
├── docker-compose.yml        # Multi-service deployment
├── .env.example              # Configuration template
└── README.md                 # This file
```

## Quick Start

### 1. Prerequisites

- Node.js 18+ (for local development)
- Docker & Docker Compose
- Neon PostgreSQL account (free tier at neon.tech)

### 2. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your settings
nano .env

# Key variables:
# - DATABASE_URL: Your Neon connection string
# - API_KEY: Secret key for web UI access
# - SMTP_PORT: Port for incoming emails (default: 25)
# - UI_PORT: Port for web interface (default: 3000)
```

### 3. Deploy with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Access Web Interface

Open `http://localhost:3000` and enter your `API_KEY` to:
- Add email addresses to receive on
- Configure webhook destinations
- Create routing rules (which emails → which webhooks)

## Usage

### Adding an Email Address

1. Go to **Email Addresses** tab
2. Enter the email address (e.g., `webhook@yourdomain.com`)
3. Add optional description
4. Click "Add Email"

### Adding a Webhook Destination

1. Go to **Webhook Destinations** tab
2. Enter the webhook URL (e.g., `https://api.example.com/webhooks/incoming`)
3. Select HTTP method (POST, PUT, PATCH)
4. Click "Add Webhook"

### Creating a Routing Rule

1. Go to **Routing Rules** tab
2. Give the rule a name
3. Select email address to receive on
4. Select webhook destination to forward to
5. Click "Create Rule"

When an email arrives at the configured email address, it will be automatically forwarded to the webhook endpoint as JSON.

## Webhook Payload Format

Emails are forwarded as JSON POST requests:

```json
{
  "from": {
    "address": "sender@example.com",
    "name": "Sender Name"
  },
  "to": [
    {
      "address": "webhook@yourdomain.com",
      "name": "Webhook Recipient"
    }
  ],
  "subject": "Email Subject",
  "text": "Plain text body",
  "html": "<html>HTML body</html>",
  "headers": {
    "message-id": "<unique-id@example.com>",
    "date": "2025-11-16T12:00:00Z"
  },
  "messageId": "<unique-id@example.com>",
  "date": "2025-11-16T12:00:00Z",
  "receivedAt": "2025-11-16T12:05:00Z",
  "attachments": [
    {
      "filename": "document.pdf",
      "contentType": "application/pdf",
      "size": 1024,
      "checksum": "abc123..."
    }
  ]
}
```

## API Endpoints

All endpoints require `x-api-key` header with your API key.

### Email Addresses

- `GET /api/email-addresses` - List all email addresses
- `POST /api/email-addresses` - Add new email address
- `PATCH /api/email-addresses/:id` - Update email address
- `DELETE /api/email-addresses/:id` - Delete email address

### Webhook Destinations

- `GET /api/webhooks` - List all webhooks
- `POST /api/webhooks` - Add new webhook
- `PATCH /api/webhooks/:id` - Update webhook
- `DELETE /api/webhooks/:id` - Delete webhook

### Routing Rules

- `GET /api/routing-rules` - List all rules
- `POST /api/routing-rules` - Create new rule
- `DELETE /api/routing-rules/:id` - Delete rule

## Development

### Local Setup

```bash
# Install dependencies
cd ui && npm install
cd ../engine && npm install

# Run migrations
npm run migrate

# Start services locally
# Terminal 1: Engine
cd engine && npm run dev

# Terminal 2: UI
cd ui && npm run dev
```

### Building Docker Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build ui
docker-compose build engine
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `DATABASE_URL` | Required | Neon PostgreSQL connection string |
| `API_KEY` | Required | Secret key for API access |
| `SMTP_PORT` | `25` | SMTP listening port |
| `UI_PORT` | `3000` | Web interface port |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |

## Troubleshooting

### Can't connect to database

```bash
# Test connection
psql $DATABASE_URL

# Check migrations ran
docker-compose logs engine | grep migration
```

### Webhooks not being called

```bash
# Check engine logs
docker-compose logs engine

# Verify routing rule exists
curl -H "x-api-key: YOUR_KEY" http://localhost:3000/api/routing-rules

# Test webhook with curl
curl -X POST http://your-webhook.com/endpoint \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Port already in use

```bash
# Check what's using port 25 or 3000
lsof -i :25
lsof -i :3000

# Change ports in .env
SMTP_PORT=2525
UI_PORT=3001
```

## Deployment

### Coolify

1. Connect your Git repository
2. Create two services:
   - **engine**: Dockerfile at `engine/Dockerfile`
   - **ui**: Dockerfile at `ui/Dockerfile`
3. Set environment variables for both services
4. Deploy

### VPS (Manual)

```bash
# SSH into server
ssh user@your-vps

# Clone repository
git clone https://github.com/yourorg/mailhooks.git
cd mailhooks

# Create .env with your settings
nano .env

# Deploy with Docker Compose
docker-compose up -d

# View status
docker-compose ps
docker-compose logs -f
```

## Security Considerations

- **SMTP is open** - Any sender can send emails to your domain. Use DNS MX records or firewall to restrict sources.
- **API Key** - Protect your `API_KEY` environment variable (store in secure vault)
- **HTTPS** - Configure reverse proxy (nginx/Caddy) for production
- **Database** - Use Neon's IP allowlist for additional security
- **Webhooks** - Validate webhook signatures in your receiving endpoint

## License

MIT – See LICENSE file

## Architecture Notes

### Fork Strategy

This project uses a **fork-based architecture** for proper attribution:

- **Core SMTP Engine**: [learnwithcc/inbound-email](https://github.com/learnwithcc/inbound-email) (fork of [kriiv/inbound-email](https://github.com/kriiv/inbound-email))
  - Provides all SMTP server functionality
  - Handles email parsing, routing, and webhook forwarding
  - Original project by [Martin Krivosija](https://linkedin.com/in/martin-alexander-k)

- **Mail Hooks Manager**: This repository
  - Provides web management interface (UI)
  - Handles database orchestration and schema
  - Manages email addresses, webhooks, and routing rules
  - Provides Docker Compose deployment for both services

### Why This Structure?

1. **Proper Attribution**: Maintains credit to the original kriiv/inbound-email developer
2. **Separation of Concerns**: SMTP logic vs management interface
3. **Reusability**: The fork can be used independently or with other projects
4. **Maintainability**: Changes to SMTP logic don't require UI rebuilds

## Credits

Built on [kriiv/inbound-email](https://github.com/kriiv/inbound-email) with:
- Enhanced Docker support and deployment documentation
- Web management interface for multi-project email handling
- Database integration via Neon PostgreSQL
- Ultra-minimal UI for email/webhook/routing configuration

## Support

- Check logs: `docker-compose logs engine` or `docker-compose logs ui`
- Review configuration: `cat .env`
- Test endpoints: Use provided API endpoints with `curl` or Postman
