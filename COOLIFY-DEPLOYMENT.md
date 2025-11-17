---
title: "Mail Hooks – Coolify Production Deployment Guide"
domain: deployment
category: guide
type: coolify-setup
created: 2025-11-16
tags:
  - deployment
  - coolify
  - docker-compose
  - production
---

# Mail Hooks – Coolify Deployment Guide

Quick deployment guide for getting Mail Hooks running on Coolify in production.

## Prerequisites

- Coolify instance running
- GitHub access (repo at https://github.com/learnwithcc/mailhooks)
- Neon PostgreSQL account with active database
- Domain name for web UI (optional but recommended)

## Step 1: Connect GitHub Repository to Coolify

1. **Log into Coolify Dashboard**
2. **Create New Project** → `Mail Hooks`
3. **Add Service** → Select `Docker Compose`
4. **Connect Repository**:
   - URL: `https://github.com/learnwithcc/mailhooks.git`
   - Branch: `main`
   - Docker Compose File: `docker-compose.yml`

## Step 2: Configure Environment Variables

In Coolify, set these environment variables for the project:

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@db.neon.tech/mailhooks?sslmode=require

# API Authentication (change this!)
API_KEY=your-super-secret-api-key-change-this

# Node Environment
NODE_ENV=production
LOG_LEVEL=info

# Services
SMTP_PORT=25
UI_PORT=3000
```

**🔒 Security Tips**:
- Generate a strong `API_KEY` (at least 32 characters)
- Store it in your password manager
- Keep the `DATABASE_URL` secret (don't commit it)
- Use Coolify's secret manager if available

## Step 3: Configure Port Mapping (if needed)

**SMTP Port (25)**:
- If your VPS can accept mail on port 25, expose it directly
- If port 25 is blocked, use port 587 or 2525 and configure upstream firewall rules
- Update `SMTP_PORT` in environment variables accordingly

**Web UI Port (3000)**:
- Coolify will expose on a subdomain or custom domain
- Configure reverse proxy through Coolify's domain settings

## Step 4: Deploy

1. **In Coolify Dashboard**: Click **Deploy**
2. **Monitor Logs**: Watch both `engine` and `ui` containers starting
3. **Wait for Health Checks**: Both services should show healthy status
4. **Verify Deployment**:
   ```bash
   # Check if SMTP is listening (may need to SSH into VPS)
   telnet your-domain.com 25
   # Should see SMTP banner response
   ```

## Step 5: Access Web Interface

1. **Get the URL** from Coolify (something like `mailhooks-ui.your-domain.com`)
2. **Access the UI** in your browser
3. **Enter your API_KEY** when prompted
4. **Start configuring**:
   - Add email addresses
   - Add webhook destinations
   - Create routing rules

## Step 6: Test Email Flow

1. **Send test email** to one of your configured addresses:
   ```bash
   # From any email client or using swaks
   swaks --to webhook@yourdomain.com \
     --from test@example.com \
     --server your-domain.com:25 \
     --body "Test message"
   ```

2. **Check webhook logs** in your receiving endpoint
3. **Verify in UI**: Check routing rules and webhook destinations for any errors

## Post-Deployment Configuration

### DNS MX Records (for actual email delivery)

If using a custom domain, configure MX records:

```
mail.yourdomain.com  MX  10  your-vps-ip
```

### Firewall Rules

Ensure firewall allows:
- **Inbound**: Port 25 (SMTP) from your email sources
- **Outbound**: Port 443 (HTTPS) to webhook endpoints

### Monitoring & Logs

In Coolify:
- View `engine` container logs for SMTP issues
- View `ui` container logs for API/database issues
- Set up alerts for container restarts

## Troubleshooting

### Engine won't start
```
Check logs: "Database migrations failed"
→ Verify DATABASE_URL is correct and accessible from VPS
→ Run migrations manually: docker-compose exec engine npm run migrate
```

### UI shows 500 errors
```
Check logs: "Cannot connect to database"
→ Ensure DATABASE_URL is set
→ Test connection: psql $DATABASE_URL
```

### Webhooks not being called
```
Check engine logs for routing rules
→ Verify email address exists in UI
→ Verify webhook destination is reachable
→ Check webhook endpoint logs
```

### SMTP not accepting emails
```
Test connectivity: telnet your-domain.com 25
→ Should show SMTP banner (220...)
→ If fails, check firewall rules
→ Verify SMTP_PORT environment variable
```

## Scaling & Maintenance

### Adding More Webhook Destinations
Simply add them in the UI—no restart needed. The engine auto-detects changes.

### Updating the Application
1. Merge changes to `main` branch on GitHub
2. Coolify automatically deploys on push (if webhook configured)
3. Or manually trigger redeploy in Coolify dashboard

### Database Backups
- Configure Neon auto-backups (go.neon.tech)
- Backups are retained for 7 days on free tier

## Security Checklist

- [ ] Changed `API_KEY` to strong value
- [ ] `DATABASE_URL` stored securely (not in git)
- [ ] Firewall rules restrict SMTP access
- [ ] HTTPS enabled for web UI (Coolify reverse proxy)
- [ ] Webhook endpoints validate requests
- [ ] Monitor logs for suspicious activity

## Support

**Logs**: Available in Coolify dashboard for both containers
**Debugging**: Check both engine and ui logs (they log separately)
**Issues**: Review README.md for architecture and API documentation

---

**Deployment Time**: ~5 minutes
**Next Step**: Configure your first email address and test email flow
