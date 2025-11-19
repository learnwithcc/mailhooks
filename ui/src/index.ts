/**
 * Mail Hooks UI Server
 *
 * Provides a web-based management interface for the Mail Hooks email forwarding system.
 * This server handles:
 * - Session-based authentication with API key
 * - CRUD operations for email addresses, webhook destinations, and routing rules
 * - HTML UI rendering for the management dashboard
 *
 * @module mailhooks-ui
 * @requires hono - Lightweight web framework
 * @requires pg - PostgreSQL client for database operations
 * @requires crypto - For secure session token generation
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';

const app = new Hono();

/**
 * PostgreSQL connection pool for database operations.
 * Configured using the DATABASE_URL environment variable.
 *
 * @constant {Pool}
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
});

/**
 * Represents an active user session.
 * Sessions are stored in-memory and expire after 24 hours.
 *
 * @interface Session
 * @property {string} token - Unique session identifier (64-character hex string)
 * @property {number} createdAt - Unix timestamp when session was created
 * @property {number} expiresAt - Unix timestamp when session expires
 */
interface Session {
  token: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * In-memory session storage.
 * Maps session tokens to Session objects.
 *
 * @type {Map<string, Session>}
 */
const sessions = new Map<string, Session>();

/**
 * Session validity duration in milliseconds (24 hours).
 *
 * @constant {number}
 */
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generates a cryptographically secure random session token.
 * Uses 32 random bytes converted to a 64-character hexadecimal string.
 *
 * @returns {string} A 64-character hexadecimal session token
 * @private
 */
function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Creates a new session and stores it in the session map.
 *
 * @returns {string} The newly generated session token
 * @private
 */
function createSession(): string {
  const token = generateSessionToken();
  const now = Date.now();
  sessions.set(token, {
    token,
    createdAt: now,
    expiresAt: now + SESSION_DURATION,
  });
  return token;
}

/**
 * Validates a session token and checks if it has expired.
 * Automatically removes expired sessions from the session map.
 *
 * @param {string} token - The session token to validate
 * @returns {boolean} True if the session exists and is not expired, false otherwise
 * @private
 */
function isValidSession(token: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

/**
 * Extracts the session token from the request headers.
 * Looks for the 'x-session-token' header.
 *
 * @param {any} c - The Hono context object
 * @returns {string | null} The session token if present, null otherwise
 * @private
 */
function getSessionFromRequest(c: any): string | null {
  return c.req.header('x-session-token') || null;
}

/**
 * POST /api/login - Authenticate user with API key
 *
 * Validates the provided API key against the API_KEY environment variable.
 * On success, creates a new session and returns the session token.
 *
 * @route POST /api/login
 * @body {Object} body - Request body
 * @body {string} body.apiKey - The API key to authenticate with
 * @returns {Object} 200 - { token: string, expiresAt: number }
 * @returns {Object} 401 - { error: "Invalid API key" }
 * @returns {Object} 500 - { error: "Login failed" }
 */
app.post('/api/login', async (c) => {
  try {
    const { apiKey } = await c.req.json();
    const expectedKey = process.env.API_KEY;

    if (apiKey !== expectedKey) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    const sessionToken = createSession();
    return c.json({ token: sessionToken, expiresAt: sessions.get(sessionToken)!.expiresAt });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

/**
 * POST /api/logout - End the current session
 *
 * Removes the session token from the session map, effectively logging out the user.
 * Always returns success, even if the session doesn't exist.
 *
 * @route POST /api/logout
 * @header {string} x-session-token - The session token (required by middleware)
 * @returns {Object} 200 - { success: true }
 */
app.post('/api/logout', async (c) => {
  const sessionToken = getSessionFromRequest(c);
  if (sessionToken) {
    sessions.delete(sessionToken);
  }
  return c.json({ success: true });
});

/**
 * Middleware: Session authentication for API routes
 *
 * Protects all /api/* routes by validating the session token.
 * Returns 401 Unauthorized if the token is missing or invalid.
 * Skips login and logout routes via explicit route definition.
 *
 * @middleware
 */
app.use('/api/*', async (c, next) => {
  const sessionToken = getSessionFromRequest(c);

  if (!sessionToken || !isValidSession(sessionToken)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
});

/**
 * GET / - Serve the main UI
 *
 * Returns the HTML UI for the management dashboard.
 *
 * @route GET /
 * @returns {string} HTML page
 */
app.get('/', async (c) => {
  return c.html(getAppHtml());
});

// API Routes: Email Addresses
app.get('/api/email-addresses', async (c) => {
  try {
    const result = await pool.query(
      'SELECT id, email, status, description, created_at FROM email_addresses ORDER BY created_at DESC'
    );
    return c.json(result.rows);
  } catch (error) {
    console.error('Error fetching email addresses:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

app.post('/api/email-addresses', async (c) => {
  try {
    const { email, description } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    const result = await pool.query(
      'INSERT INTO email_addresses (email, status, description) VALUES ($1, $2, $3) RETURNING *',
      [email, 'active', description || '']
    );

    return c.json(result.rows[0], 201);
  } catch (error) {
    console.error('Error creating email address:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

app.delete('/api/email-addresses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await pool.query('DELETE FROM email_addresses WHERE id = $1', [id]);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting email address:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

// API Routes: Webhooks
app.get('/api/webhooks', async (c) => {
  try {
    const result = await pool.query(
      'SELECT id, url, method, created_at FROM webhooks ORDER BY created_at DESC'
    );
    return c.json(result.rows);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

app.post('/api/webhooks', async (c) => {
  try {
    const { url, method } = await c.req.json();

    if (!url || !method) {
      return c.json({ error: 'URL and method are required' }, 400);
    }

    const result = await pool.query(
      'INSERT INTO webhooks (url, method) VALUES ($1, $2) RETURNING *',
      [url, method]
    );

    return c.json(result.rows[0], 201);
  } catch (error) {
    console.error('Error creating webhook:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

app.delete('/api/webhooks/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await pool.query('DELETE FROM webhooks WHERE id = $1', [id]);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

// API Routes: Routing Rules
app.get('/api/routing-rules', async (c) => {
  try {
    const result = await pool.query(
      `SELECT
        r.id,
        r.name,
        r.email_id,
        r.webhook_id,
        e.email as email_address,
        w.url as webhook_url,
        r.created_at
      FROM routing_rules r
      JOIN email_addresses e ON r.email_id = e.id
      JOIN webhooks w ON r.webhook_id = w.id
      ORDER BY r.created_at DESC`
    );
    return c.json(result.rows);
  } catch (error) {
    console.error('Error fetching routing rules:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

app.post('/api/routing-rules', async (c) => {
  try {
    const { name, email_id, webhook_id } = await c.req.json();

    if (!name || !email_id || !webhook_id) {
      return c.json({ error: 'Name, email_id, and webhook_id are required' }, 400);
    }

    const result = await pool.query(
      'INSERT INTO routing_rules (name, email_id, webhook_id) VALUES ($1, $2, $3) RETURNING *',
      [name, email_id, webhook_id]
    );

    return c.json(result.rows[0], 201);
  } catch (error) {
    console.error('Error creating routing rule:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

app.delete('/api/routing-rules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await pool.query('DELETE FROM routing_rules WHERE id = $1', [id]);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting routing rule:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Inline HTML - single-page app that handles login/dashboard client-side
function getAppHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mail Hooks</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; background: white; color: #000; line-height: 1.6; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .hidden { display: none; }
    h1 { font-size: 1.5em; font-weight: 600; margin: 1em 0 0.5em 0; }
    h2 { font-size: 1.2em; font-weight: 600; margin: 1em 0 0.5em 0; }
    input, select, textarea { font: inherit; }
    input, select { border: 1px solid #ccc; padding: 0.4em 0.6em; }
    input:focus, select:focus { outline: none; border-color: #0066cc; }
    button { background: none; border: 1px solid #ccc; padding: 0.4em 0.8em; cursor: pointer; }
    button:hover { background: #f0f0f0; }
    .container { max-width: 900px; margin: 0 auto; padding: 2em; }
    form { margin: 1em 0; }
    .form-row { display: flex; gap: 1em; margin: 0.5em 0; flex-wrap: wrap; }
    .form-field { flex: 1; min-width: 150px; }
    label { display: block; font-weight: 600; margin-bottom: 0.2em; }
    .item { border: 1px solid #ccc; padding: 0.8em; margin: 0.5em 0; }
    .item-row { display: flex; justify-content: space-between; align-items: center; }
    .item-actions { display: flex; gap: 0.5em; }
    .error { color: #cc0000; margin: 0.5em 0; }
    .nav { border-bottom: 1px solid #ccc; margin-bottom: 1em; }
    .nav-link { display: inline-block; padding: 0.8em 1em; border: none; background: none; cursor: pointer; font-size: 1em; }
    .nav-link.active { border-bottom: 2px solid #0066cc; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
  </style>
</head>
<body>
  <!-- Login View -->
  <div id="loginView" class="container" style="max-width: 400px; margin: 5em auto;">
    <h1>Mail Hooks</h1>
    <p style="color: #666; margin: 1em 0;">Enter your API key to access the management interface</p>

    <form onsubmit="handleLogin(event)">
      <div class="form-field">
        <label for="apiKey">API Key</label>
        <input type="password" id="apiKey" autocomplete="new-password" required style="width: 100%;">
      </div>

      <div id="errorMessage" class="hidden error"></div>

      <button type="submit" style="width: 100%; margin-top: 1em;">login</button>
    </form>
  </div>

  <!-- Dashboard View -->
  <div id="dashboardView" class="hidden">
    <div class="container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2em; border-bottom: 1px solid #ccc; padding-bottom: 1em;">
        <h1 style="margin: 0;">Mail Hooks Management</h1>
        <button onclick="logout()">logout</button>
      </div>

      <!-- Navigation Tabs -->
      <div class="nav">
        <button class="nav-link active" onclick="switchTab('emails')">Email Addresses</button>
        <button class="nav-link" onclick="switchTab('webhooks')">Webhook Destinations</button>
        <button class="nav-link" onclick="switchTab('rules')">Routing Rules</button>
      </div>

      <!-- Email Addresses Tab -->
      <div id="emails" class="tab-content active">
        <h2>Email Addresses</h2>
        <form onsubmit="addEmailAddress(event)">
          <div class="form-row">
            <div class="form-field">
              <input type="email" id="emailInput" placeholder="email@example.com" required>
            </div>
            <div class="form-field">
              <input type="text" id="descriptionInput" placeholder="description (optional)">
            </div>
            <button type="submit">add</button>
          </div>
        </form>
        <div id="emailsList"></div>
      </div>

      <!-- Webhooks Tab -->
      <div id="webhooks" class="tab-content">
        <h2>Webhook Destinations</h2>
        <form onsubmit="addWebhook(event)">
          <div class="form-row">
            <div class="form-field" style="flex: 2;">
              <input type="url" id="webhookUrlInput" placeholder="https://example.com/webhook" required style="width: 100%;">
            </div>
            <div class="form-field">
              <select id="methodInput">
                <option>POST</option>
                <option>PUT</option>
                <option>PATCH</option>
              </select>
            </div>
            <button type="submit">add</button>
          </div>
        </form>
        <div id="webhooksList"></div>
      </div>

      <!-- Routing Rules Tab -->
      <div id="rules" class="tab-content">
        <h2>Routing Rules</h2>
        <form onsubmit="addRoutingRule(event)">
          <div class="form-row">
            <div class="form-field">
              <input type="text" id="ruleNameInput" placeholder="rule name" required>
            </div>
            <div class="form-field">
              <select id="emailSelectInput"></select>
            </div>
            <div class="form-field">
              <select id="webhookSelectInput"></select>
            </div>
            <button type="submit">add</button>
          </div>
        </form>
        <div id="rulesList"></div>
      </div>
    </div>
  </div>

  <script>
    function getAuthHeaders() {
      const token = localStorage.getItem('sessionToken');
      return {
        'content-type': 'application/json',
        ...(token && { 'x-session-token': token })
      };
    }

    function initializeApp() {
      const token = localStorage.getItem('sessionToken');
      if (token) {
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('dashboardView').classList.remove('hidden');
        loadData();
      }
    }

    async function handleLogin(e) {
      e.preventDefault();
      const apiKey = document.getElementById('apiKey').value;
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ apiKey })
        });

        if (!response.ok) {
          const error = await response.json();
          document.getElementById('errorMessage').textContent = error.error || 'Login failed';
          document.getElementById('errorMessage').classList.remove('hidden');
          return;
        }

        const data = await response.json();
        localStorage.setItem('sessionToken', data.token);
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('dashboardView').classList.remove('hidden');
        loadData();
      } catch (error) {
        console.error('Login error:', error);
        document.getElementById('errorMessage').textContent = 'Network error';
        document.getElementById('errorMessage').classList.remove('hidden');
      }
    }

    function logout() {
      localStorage.removeItem('sessionToken');
      document.getElementById('loginView').classList.remove('hidden');
      document.getElementById('dashboardView').classList.add('hidden');
      document.getElementById('apiKey').value = '';
      document.getElementById('errorMessage').classList.add('hidden');
    }

    function switchTab(tab) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
      document.getElementById(tab).classList.add('active');
      event.target.classList.add('active');
    }

    async function loadData() {
      await loadEmailAddresses();
      await loadWebhooks();
      await loadRoutingRules();
    }

    async function loadEmailAddresses() {
      try {
        const response = await fetch('/api/email-addresses', { headers: getAuthHeaders() });
        if (!response.ok) {
          console.error('Failed to load emails:', response.status);
          const list = document.getElementById('emailsList');
          list.innerHTML = '<div class="error">Failed to load emails. Please log in again.</div>';
          return;
        }
        const emails = await response.json();
        const list = document.getElementById('emailsList');
        list.innerHTML = '';
        emails.forEach(email => {
          const item = document.createElement('div');
          item.className = 'item';
          item.innerHTML = \`
            <div class="item-row">
              <div>
                <strong>\${email.email}</strong><br>
                <small style="color: #666;">\${email.description || 'No description'}</small>
              </div>
              <div class="item-actions">
                <button onclick="deleteEmail('\${email.id}')">delete</button>
              </div>
            </div>
          \`;
          list.appendChild(item);
        });
      } catch (error) {
        console.error('Error loading emails:', error);
      }
    }

    async function addEmailAddress(e) {
      e.preventDefault();
      const email = document.getElementById('emailInput').value;
      const description = document.getElementById('descriptionInput').value;
      try {
        const response = await fetch('/api/email-addresses', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ email, description })
        });
        if (response.ok) {
          document.getElementById('emailInput').value = '';
          document.getElementById('descriptionInput').value = '';
          await loadEmailAddresses();
        }
      } catch (error) {
        console.error('Error adding email:', error);
      }
    }

    async function deleteEmail(id) {
      try {
        await fetch(\`/api/email-addresses/\${id}\`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        await loadEmailAddresses();
      } catch (error) {
        console.error('Error deleting email:', error);
      }
    }

    async function loadWebhooks() {
      try {
        const response = await fetch('/api/webhooks', { headers: getAuthHeaders() });
        if (!response.ok) {
          console.error('Failed to load webhooks:', response.status);
          const list = document.getElementById('webhooksList');
          list.innerHTML = '<div class="error">Failed to load webhooks. Please log in again.</div>';
          return;
        }
        const webhooks = await response.json();
        const list = document.getElementById('webhooksList');
        list.innerHTML = '';
        webhooks.forEach(webhook => {
          const item = document.createElement('div');
          item.className = 'item';
          item.innerHTML = \`
            <div class="item-row">
              <div>
                <strong>\${webhook.url}</strong><br>
                <small style="color: #666;">Method: \${webhook.method}</small>
              </div>
              <div class="item-actions">
                <button onclick="deleteWebhook('\${webhook.id}')">delete</button>
              </div>
            </div>
          \`;
          list.appendChild(item);
        });

        // Update webhook select in rules
        const select = document.getElementById('webhookSelectInput');
        select.innerHTML = '';
        webhooks.forEach(webhook => {
          const option = document.createElement('option');
          option.value = webhook.id;
          option.textContent = webhook.url;
          select.appendChild(option);
        });
      } catch (error) {
        console.error('Error loading webhooks:', error);
      }
    }

    async function addWebhook(e) {
      e.preventDefault();
      const url = document.getElementById('webhookUrlInput').value;
      const method = document.getElementById('methodInput').value;
      try {
        const response = await fetch('/api/webhooks', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ url, method })
        });
        if (response.ok) {
          document.getElementById('webhookUrlInput').value = '';
          await loadWebhooks();
        }
      } catch (error) {
        console.error('Error adding webhook:', error);
      }
    }

    async function deleteWebhook(id) {
      try {
        await fetch(\`/api/webhooks/\${id}\`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        await loadWebhooks();
      } catch (error) {
        console.error('Error deleting webhook:', error);
      }
    }

    async function loadRoutingRules() {
      try {
        // Load emails for select
        const emailsResponse = await fetch('/api/email-addresses', { headers: getAuthHeaders() });
        if (!emailsResponse.ok) {
          console.error('Failed to load emails for rules:', emailsResponse.status);
          document.getElementById('rulesList').innerHTML = '<div class="error">Failed to load rules. Please log in again.</div>';
          return;
        }
        const emails = await emailsResponse.json();
        const emailSelect = document.getElementById('emailSelectInput');
        emailSelect.innerHTML = '';
        emails.forEach(email => {
          const option = document.createElement('option');
          option.value = email.id;
          option.textContent = email.email;
          emailSelect.appendChild(option);
        });

        // Load rules list
        const response = await fetch('/api/routing-rules', { headers: getAuthHeaders() });
        if (!response.ok) {
          console.error('Failed to load routing rules:', response.status);
          document.getElementById('rulesList').innerHTML = '<div class="error">Failed to load rules. Please log in again.</div>';
          return;
        }
        const rules = await response.json();
        const list = document.getElementById('rulesList');
        list.innerHTML = '';
        rules.forEach(rule => {
          const item = document.createElement('div');
          item.className = 'item';
          item.innerHTML = \`
            <div class="item-row">
              <div>
                <strong>\${rule.name}</strong><br>
                <small style="color: #666;">Email: \${rule.email_address} → Webhook: \${rule.webhook_url}</small>
              </div>
              <div class="item-actions">
                <button onclick="deleteRule('\${rule.id}')">delete</button>
              </div>
            </div>
          \`;
          list.appendChild(item);
        });
      } catch (error) {
        console.error('Error loading rules:', error);
      }
    }

    async function addRoutingRule(e) {
      e.preventDefault();
      const name = document.getElementById('ruleNameInput').value;
      const email_id = document.getElementById('emailSelectInput').value;
      const webhook_id = document.getElementById('webhookSelectInput').value;
      try {
        const response = await fetch('/api/routing-rules', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name, email_id, webhook_id })
        });
        if (response.ok) {
          document.getElementById('ruleNameInput').value = '';
          await loadRoutingRules();
        }
      } catch (error) {
        console.error('Error adding rule:', error);
      }
    }

    async function deleteRule(id) {
      try {
        await fetch(\`/api/routing-rules/\${id}\`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        await loadRoutingRules();
      } catch (error) {
        console.error('Error deleting rule:', error);
      }
    }

    document.addEventListener('DOMContentLoaded', initializeApp);
  </script>
</body>
</html>`;
}

const port = parseInt(process.env.UI_PORT || '3000', 10);

serve({
  fetch: app.fetch,
  port,
}, (info: { port: number }) => {
  console.log(`Mail Hooks UI running on http://localhost:${info.port}`);
});
