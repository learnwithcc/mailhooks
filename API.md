# Mail Hooks API Documentation

Complete API reference for the Mail Hooks email forwarding system.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Response Formats](#response-formats)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Email Addresses](#email-addresses-endpoints)
  - [Webhook Destinations](#webhook-destinations-endpoints)
  - [Routing Rules](#routing-rules-endpoints)
  - [Health Check](#health-check-endpoint)
- [Webhook Payloads](#webhook-payloads)
- [Examples](#examples)

## Overview

The Mail Hooks API is a RESTful API that allows you to manage email addresses, webhook destinations, and routing rules for your email forwarding system.

**API Version:** 0.1.0
**Content Type:** `application/json`

## Authentication

### Session-Based Authentication

The API uses session-based authentication with API keys:

1. **Login** with your API key to receive a session token
2. Include the session token in the `x-session-token` header for all subsequent requests
3. Sessions expire after **24 hours** of inactivity

### Authentication Header

All protected endpoints require:

```http
x-session-token: your-session-token-here
```

## Base URL

**Development:**
```
http://localhost:3000
```

**Production:**
```
https://your-domain.com
```

## Response Formats

### Success Responses

**Single Resource:**
```json
{
  "id": 1,
  "email": "webhook@example.com",
  "status": "active",
  "created_at": "2025-11-17T12:00:00Z"
}
```

**Collection:**
```json
[
  {
    "id": 1,
    "email": "webhook@example.com",
    "status": "active"
  },
  {
    "id": 2,
    "email": "alerts@example.com",
    "status": "active"
  }
]
```

### Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200  | OK | Request succeeded |
| 201  | Created | Resource created successfully |
| 400  | Bad Request | Invalid request parameters |
| 401  | Unauthorized | Missing or invalid authentication |
| 404  | Not Found | Resource doesn't exist |
| 500  | Internal Server Error | Server error occurred |

### Common Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**400 Bad Request:**
```json
{
  "error": "Email is required"
}
```

**404 Not Found:**
```json
{
  "error": "Not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Database error"
}
```

## Rate Limiting

Currently, there are **no rate limits** on the API. Future versions may implement rate limiting for production use.

---

## API Endpoints

## Authentication Endpoints

### POST /api/login

Authenticate with your API key to receive a session token.

**Request:**
```http
POST /api/login
Content-Type: application/json

{
  "apiKey": "your-api-key-here"
}
```

**Success Response (200):**
```json
{
  "token": "a1b2c3d4e5f6...",
  "expiresAt": 1700000000000
}
```

**Error Response (401):**
```json
{
  "error": "Invalid API key"
}
```

---

### POST /api/logout

End the current session.

**Request:**
```http
POST /api/logout
x-session-token: your-session-token-here
```

**Response (200):**
```json
{
  "success": true
}
```

---

## Email Addresses Endpoints

### GET /api/emails

Retrieve all email addresses.

**Request:**
```http
GET /api/emails
x-session-token: your-session-token-here
```

**Response (200):**
```json
[
  {
    "id": 1,
    "email": "incoming@example.com",
    "status": "active",
    "created_at": "2025-11-17T12:00:00Z",
    "updated_at": "2025-11-17T12:00:00Z"
  },
  {
    "id": 2,
    "email": "alerts@example.com",
    "status": "active",
    "created_at": "2025-11-17T12:05:00Z",
    "updated_at": "2025-11-17T12:05:00Z"
  }
]
```

---

### POST /api/emails

Create a new email address.

**Request:**
```http
POST /api/emails
Content-Type: application/json
x-session-token: your-session-token-here

{
  "email": "newemail@example.com"
}
```

**Success Response (201):**
```json
{
  "id": 3,
  "email": "newemail@example.com",
  "status": "active",
  "created_at": "2025-11-17T12:10:00Z",
  "updated_at": "2025-11-17T12:10:00Z"
}
```

**Error Response (400):**
```json
{
  "error": "Email is required"
}
```

---

### GET /api/emails/:id

Retrieve a specific email address.

**Request:**
```http
GET /api/emails/1
x-session-token: your-session-token-here
```

**Response (200):**
```json
{
  "id": 1,
  "email": "incoming@example.com",
  "status": "active",
  "created_at": "2025-11-17T12:00:00Z",
  "updated_at": "2025-11-17T12:00:00Z"
}
```

---

### PUT /api/emails/:id

Update an email address.

**Request:**
```http
PUT /api/emails/1
Content-Type: application/json
x-session-token: your-session-token-here

{
  "status": "inactive"
}
```

**Response (200):**
```json
{
  "id": 1,
  "email": "incoming@example.com",
  "status": "inactive",
  "created_at": "2025-11-17T12:00:00Z",
  "updated_at": "2025-11-17T12:15:00Z"
}
```

---

### DELETE /api/emails/:id

Delete an email address.

**Request:**
```http
DELETE /api/emails/1
x-session-token: your-session-token-here
```

**Response (200):**
```json
{
  "success": true
}
```

---

## Webhook Destinations Endpoints

### GET /api/webhooks

Retrieve all webhook destinations.

**Request:**
```http
GET /api/webhooks
x-session-token: your-session-token-here
```

**Response (200):**
```json
[
  {
    "id": 1,
    "url": "https://example.com/webhook",
    "method": "POST",
    "status": "active",
    "created_at": "2025-11-17T12:00:00Z",
    "updated_at": "2025-11-17T12:00:00Z"
  }
]
```

---

### POST /api/webhooks

Create a new webhook destination.

**Request:**
```http
POST /api/webhooks
Content-Type: application/json
x-session-token: your-session-token-here

{
  "url": "https://example.com/webhook",
  "method": "POST"
}
```

**Success Response (201):**
```json
{
  "id": 2,
  "url": "https://example.com/webhook",
  "method": "POST",
  "status": "active",
  "created_at": "2025-11-17T12:10:00Z",
  "updated_at": "2025-11-17T12:10:00Z"
}
```

---

### GET /api/webhooks/:id

Retrieve a specific webhook destination.

**Request:**
```http
GET /api/webhooks/1
x-session-token: your-session-token-here
```

**Response (200):**
```json
{
  "id": 1,
  "url": "https://example.com/webhook",
  "method": "POST",
  "status": "active",
  "created_at": "2025-11-17T12:00:00Z",
  "updated_at": "2025-11-17T12:00:00Z"
}
```

---

### PUT /api/webhooks/:id

Update a webhook destination.

**Request:**
```http
PUT /api/webhooks/1
Content-Type: application/json
x-session-token: your-session-token-here

{
  "status": "inactive"
}
```

**Response (200):**
```json
{
  "id": 1,
  "url": "https://example.com/webhook",
  "method": "POST",
  "status": "inactive",
  "created_at": "2025-11-17T12:00:00Z",
  "updated_at": "2025-11-17T12:15:00Z"
}
```

---

### DELETE /api/webhooks/:id

Delete a webhook destination.

**Request:**
```http
DELETE /api/webhooks/1
x-session-token: your-session-token-here
```

**Response (200):**
```json
{
  "success": true
}
```

---

## Routing Rules Endpoints

### GET /api/routing-rules

Retrieve all routing rules.

**Request:**
```http
GET /api/routing-rules
x-session-token: your-session-token-here
```

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Alerts to Slack",
    "email_id": 1,
    "webhook_id": 1,
    "created_at": "2025-11-17T12:00:00Z",
    "updated_at": "2025-11-17T12:00:00Z"
  }
]
```

---

### POST /api/routing-rules

Create a new routing rule.

**Request:**
```http
POST /api/routing-rules
Content-Type: application/json
x-session-token: your-session-token-here

{
  "name": "Alerts to Slack",
  "email_id": 1,
  "webhook_id": 1
}
```

**Success Response (201):**
```json
{
  "id": 2,
  "name": "Alerts to Slack",
  "email_id": 1,
  "webhook_id": 1,
  "created_at": "2025-11-17T12:10:00Z",
  "updated_at": "2025-11-17T12:10:00Z"
}
```

---

### GET /api/routing-rules/:id

Retrieve a specific routing rule.

**Request:**
```http
GET /api/routing-rules/1
x-session-token: your-session-token-here
```

**Response (200):**
```json
{
  "id": 1,
  "name": "Alerts to Slack",
  "email_id": 1,
  "webhook_id": 1,
  "created_at": "2025-11-17T12:00:00Z",
  "updated_at": "2025-11-17T12:00:00Z"
}
```

---

### PUT /api/routing-rules/:id

Update a routing rule.

**Request:**
```http
PUT /api/routing-rules/1
Content-Type: application/json
x-session-token: your-session-token-here

{
  "name": "Alerts to Discord"
}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "Alerts to Discord",
  "email_id": 1,
  "webhook_id": 1,
  "created_at": "2025-11-17T12:00:00Z",
  "updated_at": "2025-11-17T12:15:00Z"
}
```

---

### DELETE /api/routing-rules/:id

Delete a routing rule.

**Request:**
```http
DELETE /api/routing-rules/1
x-session-token: your-session-token-here
```

**Response (200):**
```json
{
  "success": true
}
```

---

## Health Check Endpoint

### GET /health

Check if the API server is running.

**Request:**
```http
GET /health
```

**Response (200):**
```json
{
  "status": "ok"
}
```

---

## Webhook Payloads

When an email is received and matches a routing rule, the webhook receives a POST request with the following payload:

### Email Webhook Payload

```json
{
  "to": "incoming@example.com",
  "from": "sender@example.com",
  "subject": "Test Email",
  "text": "This is the plain text body",
  "html": "<p>This is the HTML body</p>",
  "headers": {
    "date": "Mon, 17 Nov 2025 12:00:00 +0000",
    "message-id": "<abc123@example.com>"
  },
  "attachments": [
    {
      "filename": "document.pdf",
      "contentType": "application/pdf",
      "content": "base64-encoded-content..."
    }
  ],
  "_webhookMeta": {
    "ruleName": "Alerts to Slack",
    "priority": 1,
    "webhook": "https://example.com/webhook"
  }
}
```

### Webhook Metadata

The `_webhookMeta` field contains:

| Field | Type | Description |
|-------|------|-------------|
| `ruleName` | string | Name of the routing rule that matched |
| `priority` | number | Priority of the routing rule |
| `webhook` | string | URL of the webhook destination |

---

## Examples

### Example: Complete Email Forwarding Setup

```bash
# 1. Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"your-api-key"}' \
  -w "\n%{http_code}\n"

# Response:
# {"token":"a1b2c3d4e5f6...","expiresAt":1700000000000}
# 200

# 2. Create an email address
curl -X POST http://localhost:3000/api/emails \
  -H "Content-Type: application/json" \
  -H "x-session-token: a1b2c3d4e5f6..." \
  -d '{"email":"alerts@myapp.com"}' \
  -w "\n%{http_code}\n"

# Response:
# {"id":1,"email":"alerts@myapp.com","status":"active","created_at":"...","updated_at":"..."}
# 201

# 3. Create a webhook destination
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "x-session-token: a1b2c3d4e5f6..." \
  -d '{"url":"https://slack.example.com/webhook","method":"POST"}' \
  -w "\n%{http_code}\n"

# Response:
# {"id":1,"url":"https://slack.example.com/webhook","method":"POST","status":"active","created_at":"...","updated_at":"..."}
# 201

# 4. Create a routing rule
curl -X POST http://localhost:3000/api/routing-rules \
  -H "Content-Type: application/json" \
  -H "x-session-token: a1b2c3d4e5f6..." \
  -d '{"name":"Alerts to Slack","email_id":1,"webhook_id":1}' \
  -w "\n%{http_code}\n"

# Response:
# {"id":1,"name":"Alerts to Slack","email_id":1,"webhook_id":1,"created_at":"...","updated_at":"..."}
# 201
```

Now emails sent to `alerts@myapp.com` will be forwarded to your Slack webhook.

### Example: Test Email Forwarding

```bash
# Send a test email
swaks --to alerts@myapp.com \
      --from test@example.com \
      --header "Subject: Test Alert" \
      --body "This is a test alert"

# The email will be:
# 1. Received by Mail Hooks SMTP server
# 2. Parsed and matched against routing rules
# 3. Forwarded to your Slack webhook with full email details
```

---

## Pagination (Future)

Future versions may implement pagination for list endpoints. Currently, all items are returned.

---

## Rate Limiting (Future)

Rate limiting may be added in future versions. Currently, there are no limits.

---

## Versioning

The API uses a simple versioning scheme. All endpoints are under `/api/` and include implicit version tracking through backward compatibility.

To request a new API version, open an issue on GitHub.

---

## Support

For issues or questions:

- Check the [README.md](README.md)
- See [CONTRIBUTING.md](CONTRIBUTING.md)
- Open an issue on GitHub
- Reach out on GitHub Discussions
