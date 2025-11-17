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

Authenticate with your API key and receive a session token.

**Authentication:** None (public endpoint)

**Request Body:**
```json
{
  "apiKey": "your-api-key"
}
```

**Success Response (200 OK):**
```json
{
  "token": "64-character-hex-string",
  "expiresAt": 1700236800000
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid API key
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"your-api-key-here"}'
```

---

### POST /api/logout

End the current session.

**Authentication:** Required (`x-session-token` header)

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/logout \
  -H "x-session-token: your-token-here"
```

---

## Email Addresses Endpoints

### GET /api/email-addresses

List all configured email addresses.

**Authentication:** Required

**Query Parameters:** None

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "email": "webhook@example.com",
    "status": "active",
    "description": "Primary webhook email",
    "created_at": "2025-11-17T12:00:00Z"
  },
  {
    "id": 2,
    "email": "alerts@example.com",
    "status": "active",
    "description": "Alert notifications",
    "created_at": "2025-11-16T10:30:00Z"
  }
]
```

**Example:**
```bash
curl http://localhost:3000/api/email-addresses \
  -H "x-session-token: your-token"
```

---

### POST /api/email-addresses

Create a new email address.

**Authentication:** Required

**Request Body:**
```json
{
  "email": "webhook@example.com",
  "description": "Optional description"
}
```

**Fields:**
- `email` (string, required) - Email address to add
- `description` (string, optional) - Descriptive text

**Success Response (201 Created):**
```json
{
  "id": 3,
  "email": "webhook@example.com",
  "status": "active",
  "description": "Optional description",
  "created_at": "2025-11-17T12:00:00Z",
  "updated_at": "2025-11-17T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Email is required
- `500 Internal Server Error` - Database error (e.g., duplicate email)

**Example:**
```bash
curl -X POST http://localhost:3000/api/email-addresses \
  -H "x-session-token: your-token" \
  -H "Content-Type: application/json" \
  -d '{"email":"webhook@example.com","description":"Main webhook"}'
```

---

### PATCH /api/email-addresses/:id

Update an existing email address.

**Authentication:** Required

**URL Parameters:**
- `id` (integer) - Email address ID

**Request Body:**
```json
{
  "status": "inactive",
  "description": "Updated description"
}
```

**Fields (all optional, at least one required):**
- `status` (string) - "active" or "inactive"
- `description` (string) - Updated description

**Success Response (200 OK):**
```json
{
  "id": 1,
  "email": "webhook@example.com",
  "status": "inactive",
  "description": "Updated description",
  "created_at": "2025-11-17T12:00:00Z",
  "updated_at": "2025-11-17T13:00:00Z"
}
```

**Error Responses:**
- `404 Not Found` - Email address ID doesn't exist
- `500 Internal Server Error` - Database error

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/email-addresses/1 \
  -H "x-session-token: your-token" \
  -H "Content-Type: application/json" \
  -d '{"status":"inactive"}'
```

---

### DELETE /api/email-addresses/:id

Delete an email address.

**Authentication:** Required

**URL Parameters:**
- `id` (integer) - Email address ID

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true
}
```

**Error Responses:**
- `404 Not Found` - Email address doesn't exist
- `500 Internal Server Error` - Database error

**Note:** This will cascade delete any routing rules that reference this email address.

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/email-addresses/1 \
  -H "x-session-token: your-token"
```

---

## Webhook Destinations Endpoints

### GET /api/webhooks

List all configured webhook destinations.

**Authentication:** Required

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "url": "https://api.example.com/webhooks/incoming",
    "method": "POST",
    "status": "active",
    "description": "Main API webhook",
    "created_at": "2025-11-17T12:00:00Z"
  }
]
```

**Example:**
```bash
curl http://localhost:3000/api/webhooks \
  -H "x-session-token: your-token"
```

---

### POST /api/webhooks

Create a new webhook destination.

**Authentication:** Required

**Request Body:**
```json
{
  "url": "https://api.example.com/webhook",
  "method": "POST",
  "description": "Optional description"
}
```

**Fields:**
- `url` (string, required) - Webhook URL
- `method` (string, optional) - HTTP method: "POST" (default), "PUT", or "PATCH"
- `description` (string, optional) - Descriptive text

**Success Response (201 Created):**
```json
{
  "id": 2,
  "url": "https://api.example.com/webhook",
  "method": "POST",
  "status": "active",
  "description": "Optional description",
  "created_at": "2025-11-17T12:00:00Z",
  "updated_at": "2025-11-17T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - URL is required
- `500 Internal Server Error` - Database error

**Example:**
```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "x-session-token: your-token" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.example.com/webhook","method":"POST"}'
```

---

### PATCH /api/webhooks/:id

Update an existing webhook destination.

**Authentication:** Required

**URL Parameters:**
- `id` (integer) - Webhook ID

**Request Body:**
```json
{
  "status": "inactive",
  "description": "Updated description"
}
```

**Fields (all optional, at least one required):**
- `status` (string) - "active" or "inactive"
- `description` (string) - Updated description

**Success Response (200 OK):**
```json
{
  "id": 1,
  "url": "https://api.example.com/webhook",
  "method": "POST",
  "status": "inactive",
  "description": "Updated description",
  "created_at": "2025-11-17T12:00:00Z",
  "updated_at": "2025-11-17T13:00:00Z"
}
```

**Error Responses:**
- `404 Not Found` - Webhook ID doesn't exist
- `500 Internal Server Error` - Database error

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/webhooks/1 \
  -H "x-session-token: your-token" \
  -H "Content-Type: application/json" \
  -d '{"status":"inactive"}'
```

---

### DELETE /api/webhooks/:id

Delete a webhook destination.

**Authentication:** Required

**URL Parameters:**
- `id` (integer) - Webhook ID

**Success Response (200 OK):**
```json
{
  "success": true
}
```

**Error Responses:**
- `404 Not Found` - Webhook doesn't exist
- `500 Internal Server Error` - Database error

**Note:** This will cascade delete any routing rules that reference this webhook.

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/webhooks/1 \
  -H "x-session-token: your-token"
```

---

## Routing Rules Endpoints

### GET /api/routing-rules

List all routing rules.

**Authentication:** Required

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Alerts to Slack",
    "email_address_id": 1,
    "webhook_destination_id": 1,
    "status": "active",
    "created_at": "2025-11-17T12:00:00Z"
  }
]
```

**Example:**
```bash
curl http://localhost:3000/api/routing-rules \
  -H "x-session-token: your-token"
```

---

### POST /api/routing-rules

Create a new routing rule to connect an email address to a webhook.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Alerts to Slack",
  "email_address_id": 1,
  "webhook_destination_id": 1
}
```

**Fields:**
- `name` (string, required) - Descriptive name for the rule
- `email_address_id` (integer, required) - ID of the email address
- `webhook_destination_id` (integer, required) - ID of the webhook destination

**Success Response (201 Created):**
```json
{
  "id": 2,
  "name": "Alerts to Slack",
  "email_address_id": 1,
  "webhook_destination_id": 1,
  "status": "active",
  "created_at": "2025-11-17T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - Database error (e.g., invalid foreign keys)

**Example:**
```bash
curl -X POST http://localhost:3000/api/routing-rules \
  -H "x-session-token: your-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alerts to Slack","email_address_id":1,"webhook_destination_id":1}'
```

---

### DELETE /api/routing-rules/:id

Delete a routing rule.

**Authentication:** Required

**URL Parameters:**
- `id` (integer) - Routing rule ID

**Success Response (200 OK):**
```json
{
  "success": true
}
```

**Error Responses:**
- `404 Not Found` - Routing rule doesn't exist
- `500 Internal Server Error` - Database error

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/routing-rules/1 \
  -H "x-session-token: your-token"
```

---

## Health Check Endpoint

### GET /health

Check if the service is running.

**Authentication:** None (public endpoint)

**Success Response (200 OK):**
```json
{
  "status": "ok"
}
```

**Example:**
```bash
curl http://localhost:3000/health
```

---

## Webhook Payloads

When an email is received at a configured email address, the Mail Hooks engine forwards it to the associated webhook endpoint(s) as a JSON payload.

### Payload Structure

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
  "cc": [
    {
      "address": "cc@example.com",
      "name": "CC Recipient"
    }
  ],
  "subject": "Email Subject Line",
  "text": "Plain text body of the email",
  "html": "<html><body>HTML body of the email</body></html>",
  "headers": {
    "message-id": "<unique-id@example.com>",
    "date": "Tue, 16 Nov 2025 12:00:00 +0000",
    "from": "sender@example.com",
    "to": "webhook@yourdomain.com",
    "subject": "Email Subject Line",
    "content-type": "multipart/alternative"
  },
  "messageId": "<unique-id@example.com>",
  "date": "2025-11-16T12:00:00Z",
  "receivedAt": "2025-11-16T12:05:00Z",
  "attachments": [
    {
      "filename": "document.pdf",
      "contentType": "application/pdf",
      "size": 10240,
      "checksum": "abc123def456..."
    }
  ]
}
```

### Payload Fields

| Field | Type | Description |
|-------|------|-------------|
| `from` | Object | Sender information |
| `from.address` | String | Sender email address |
| `from.name` | String | Sender display name |
| `to` | Array | Array of recipient objects |
| `to[].address` | String | Recipient email address |
| `to[].name` | String | Recipient display name |
| `cc` | Array | Carbon copy recipients (optional) |
| `bcc` | Array | Blind carbon copy recipients (optional) |
| `subject` | String | Email subject line |
| `text` | String | Plain text body content |
| `html` | String | HTML body content (if available) |
| `headers` | Object | All email headers as key-value pairs |
| `messageId` | String | Unique message identifier |
| `date` | String | Date email was sent (ISO 8601) |
| `receivedAt` | String | Date email was received by Mail Hooks (ISO 8601) |
| `attachments` | Array | Array of attachment objects |
| `attachments[].filename` | String | Attachment filename |
| `attachments[].contentType` | String | MIME type |
| `attachments[].size` | Number | File size in bytes |
| `attachments[].checksum` | String | File checksum |

### Webhook Security

**Recommendations for webhook receivers:**

1. **Validate source** - Check sender IP or use a secret token in the webhook URL
2. **Verify checksums** - Validate attachment checksums if processing files
3. **Rate limiting** - Implement rate limiting on your webhook endpoint
4. **Idempotency** - Handle duplicate webhook calls gracefully
5. **Async processing** - Process emails asynchronously and return 200 quickly

---

## Examples

### Complete Workflow Example

```bash
# 1. Login to get session token
TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"your-api-key"}' \
  | jq -r '.token')

# 2. Create an email address
EMAIL_ID=$(curl -s -X POST http://localhost:3000/api/email-addresses \
  -H "x-session-token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"alerts@example.com","description":"Alert emails"}' \
  | jq -r '.id')

# 3. Create a webhook destination
WEBHOOK_ID=$(curl -s -X POST http://localhost:3000/api/webhooks \
  -H "x-session-token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.slack.com/webhooks/incoming","method":"POST"}' \
  | jq -r '.id')

# 4. Create a routing rule
curl -X POST http://localhost:3000/api/routing-rules \
  -H "x-session-token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Alerts to Slack\",\"email_address_id\":$EMAIL_ID,\"webhook_destination_id\":$WEBHOOK_ID}"

# 5. List all routing rules
curl -s http://localhost:3000/api/routing-rules \
  -H "x-session-token: $TOKEN" \
  | jq '.'

# 6. Logout
curl -X POST http://localhost:3000/api/logout \
  -H "x-session-token: $TOKEN"
```

### JavaScript/Node.js Example

```javascript
const API_BASE = 'http://localhost:3000';
let sessionToken = null;

// Login
async function login(apiKey) {
  const response = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey })
  });
  const data = await response.json();
  sessionToken = data.token;
  return data;
}

// Create email address
async function createEmailAddress(email, description) {
  const response = await fetch(`${API_BASE}/api/email-addresses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': sessionToken
    },
    body: JSON.stringify({ email, description })
  });
  return response.json();
}

// Create webhook
async function createWebhook(url, method = 'POST', description) {
  const response = await fetch(`${API_BASE}/api/webhooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': sessionToken
    },
    body: JSON.stringify({ url, method, description })
  });
  return response.json();
}

// Create routing rule
async function createRoutingRule(name, emailAddressId, webhookDestinationId) {
  const response = await fetch(`${API_BASE}/api/routing-rules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': sessionToken
    },
    body: JSON.stringify({ name, email_address_id: emailAddressId, webhook_destination_id: webhookDestinationId })
  });
  return response.json();
}

// Usage
(async () => {
  await login('your-api-key');
  const email = await createEmailAddress('alerts@example.com', 'Alerts');
  const webhook = await createWebhook('https://api.example.com/webhook');
  const rule = await createRoutingRule('Alerts Rule', email.id, webhook.id);
  console.log('Setup complete:', rule);
})();
```

### Python Example

```python
import requests

API_BASE = 'http://localhost:3000'
session_token = None

def login(api_key):
    global session_token
    response = requests.post(f'{API_BASE}/api/login', json={'apiKey': api_key})
    data = response.json()
    session_token = data['token']
    return data

def create_email_address(email, description=''):
    headers = {
        'Content-Type': 'application/json',
        'x-session-token': session_token
    }
    response = requests.post(
        f'{API_BASE}/api/email-addresses',
        json={'email': email, 'description': description},
        headers=headers
    )
    return response.json()

def create_webhook(url, method='POST', description=''):
    headers = {
        'Content-Type': 'application/json',
        'x-session-token': session_token
    }
    response = requests.post(
        f'{API_BASE}/api/webhooks',
        json={'url': url, 'method': method, 'description': description},
        headers=headers
    )
    return response.json()

def create_routing_rule(name, email_address_id, webhook_destination_id):
    headers = {
        'Content-Type': 'application/json',
        'x-session-token': session_token
    }
    response = requests.post(
        f'{API_BASE}/api/routing-rules',
        json={
            'name': name,
            'email_address_id': email_address_id,
            'webhook_destination_id': webhook_destination_id
        },
        headers=headers
    )
    return response.json()

# Usage
login('your-api-key')
email = create_email_address('alerts@example.com', 'Alert emails')
webhook = create_webhook('https://api.example.com/webhook')
rule = create_routing_rule('Alerts Rule', email['id'], webhook['id'])
print('Setup complete:', rule)
```

---

## Support

For API issues or questions:
- Review the [README.md](README.md)
- Check [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
- Open an issue on GitHub
