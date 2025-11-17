import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';

const app = new Hono();

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
});

// Session management
interface Session {
  token: string;
  createdAt: number;
  expiresAt: number;
}

const sessions = new Map<string, Session>();
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

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

function isValidSession(token: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function getSessionFromRequest(c: any): string | null {
  return c.req.header('x-session-token') || null;
}

// Login route (before middleware so it doesn't require auth)
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

// Logout route
app.post('/api/logout', async (c) => {
  const sessionToken = getSessionFromRequest(c);
  if (sessionToken) {
    sessions.delete(sessionToken);
  }
  return c.json({ success: true });
});

// Middleware: Session authentication for protected API routes
// Applied after login/logout so those routes aren't protected
app.use('/api/*', async (c, next) => {
  const sessionToken = getSessionFromRequest(c);

  if (!sessionToken || !isValidSession(sessionToken)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
});

// Serve single-page app for all routes (app handles routing client-side)
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
      'SELECT id, name, email_id, webhook_id, created_at FROM routing_rules ORDER BY created_at DESC'
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
  <title>Mail Hooks Management</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0f172a; color: #e2e8f0; }
    .hidden { display: none !important; }
    .nav-tab { padding: 0.5rem 1rem; border-bottom: 2px solid transparent; cursor: pointer; }
    .nav-tab:hover { border-bottom-color: #334155; }
    .nav-tab.active { border-bottom-color: #3b82f6; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
  </style>
</head>
<body>
  <!-- Login View -->
  <div id="loginView" style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem;">
    <div style="width: 100%; max-width: 28rem;">
      <div style="background-color: #1e293b; border-radius: 0.5rem; padding: 2rem; border: 1px solid #334155;">
        <h1 style="font-size: 1.875rem; font-weight: bold; margin-bottom: 0.5rem;">Mail Hooks</h1>
        <p style="color: #94a3b8; margin-bottom: 2rem;">Email Forwarding Management</p>

        <form onsubmit="handleLogin(event)" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label for="apiKey" style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem;">API Key</label>
            <input
              type="password"
              id="apiKey"
              placeholder="Enter your API key"
              required
              style="width: 100%; background-color: #0f172a; border: 1px solid #334155; border-radius: 0.25rem; padding: 0.5rem 0.75rem; color: #e2e8f0;"
            />
          </div>

          <div id="errorMessage" class="hidden" style="background-color: #7c2d12; border: 1px solid #b45309; color: #fca5a5; padding: 0.75rem; border-radius: 0.25rem; font-size: 0.875rem;"></div>

          <button
            type="submit"
            style="width: 100%; background-color: #2563eb; color: white; padding: 0.5rem 1rem; border-radius: 0.25rem; font-weight: 500; cursor: pointer; border: none;"
          >
            Login
          </button>
        </form>

        <p style="color: #94a3b8; font-size: 0.75rem; text-align: center; margin-top: 1.5rem;">
          Enter your API key to access the Mail Hooks management interface
        </p>
      </div>
    </div>
  </div>

  <!-- Dashboard View -->
  <div id="dashboardView" class="hidden" style="padding: 1.5rem;">
    <div style="max-width: 80rem; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h1 style="font-size: 1.875rem; font-weight: bold;">Mail Hooks Management</h1>
        <button onclick="logout()" style="background-color: #475569; color: white; padding: 0.5rem 1rem; border-radius: 0.25rem; cursor: pointer; border: none;">Logout</button>
      </div>

      <!-- Navigation Tabs -->
      <div style="display: flex; gap: 1rem; border-bottom: 1px solid #334155; margin-bottom: 1.5rem;">
        <div class="nav-tab active" onclick="switchTab('emails')" style="cursor: pointer;">Email Addresses</div>
        <div class="nav-tab" onclick="switchTab('webhooks')" style="cursor: pointer;">Webhook Destinations</div>
        <div class="nav-tab" onclick="switchTab('rules')" style="cursor: pointer;">Routing Rules</div>
      </div>

      <!-- Email Addresses Tab -->
      <div id="emails" class="tab-content active">
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">Email Addresses</h2>
        <form onsubmit="addEmailAddress(event)" style="background-color: #1e293b; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem;">
            <input type="email" id="emailInput" placeholder="email@example.com" required style="background-color: #0f172a; border: 1px solid #334155; border-radius: 0.25rem; padding: 0.5rem 0.75rem; color: #e2e8f0;">
            <input type="text" id="descriptionInput" placeholder="Description (optional)" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 0.25rem; padding: 0.5rem 0.75rem; color: #e2e8f0;">
            <button type="submit" style="background-color: #2563eb; color: white; border-radius: 0.25rem; cursor: pointer; border: none;">Add Email</button>
          </div>
        </form>
        <div id="emailsList" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
      </div>

      <!-- Webhooks Tab -->
      <div id="webhooks" class="tab-content">
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">Webhook Destinations</h2>
        <form onsubmit="addWebhook(event)" style="background-color: #1e293b; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1rem;">
            <input type="url" id="webhookUrlInput" placeholder="https://example.com/webhook" required style="background-color: #0f172a; border: 1px solid #334155; border-radius: 0.25rem; padding: 0.5rem 0.75rem; color: #e2e8f0; grid-column: span 2;">
            <select id="methodInput" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 0.25rem; padding: 0.5rem 0.75rem; color: #e2e8f0;">
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
            </select>
            <button type="submit" style="background-color: #2563eb; color: white; border-radius: 0.25rem; cursor: pointer; border: none;">Add Webhook</button>
          </div>
        </form>
        <div id="webhooksList" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
      </div>

      <!-- Routing Rules Tab -->
      <div id="rules" class="tab-content">
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">Routing Rules</h2>
        <form onsubmit="addRoutingRule(event)" style="background-color: #1e293b; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1rem;">
            <input type="text" id="ruleNameInput" placeholder="Rule name" required style="background-color: #0f172a; border: 1px solid #334155; border-radius: 0.25rem; padding: 0.5rem 0.75rem; color: #e2e8f0;">
            <select id="emailSelectInput" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 0.25rem; padding: 0.5rem 0.75rem; color: #e2e8f0;"></select>
            <select id="webhookSelectInput" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 0.25rem; padding: 0.5rem 0.75rem; color: #e2e8f0;"></select>
            <button type="submit" style="background-color: #2563eb; color: white; border-radius: 0.25rem; cursor: pointer; border: none;">Create Rule</button>
          </div>
        </form>
        <div id="rulesList" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
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
        loadEmailAddresses();
        loadWebhooks();
        loadRoutingRules();
      }
    }

    async function handleLogin(e) {
      e.preventDefault();
      const apiKey = document.getElementById('apiKey').value;
      const errorDiv = document.getElementById('errorMessage');
      errorDiv.classList.add('hidden');

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ apiKey })
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('sessionToken', data.token);
          document.getElementById('loginView').classList.add('hidden');
          document.getElementById('dashboardView').classList.remove('hidden');
          loadEmailAddresses();
          loadWebhooks();
          loadRoutingRules();
        } else {
          errorDiv.textContent = 'Invalid API key. Please try again.';
          errorDiv.classList.remove('hidden');
        }
      } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.classList.remove('hidden');
      }
    }

    async function logout() {
      try {
        await fetch('/api/logout', { method: 'POST', headers: getAuthHeaders() });
      } catch (error) {
        console.error('Logout error:', error);
      }
      localStorage.removeItem('sessionToken');
      document.getElementById('dashboardView').classList.add('hidden');
      document.getElementById('loginView').classList.remove('hidden');
    }

    function switchTab(tabName) {
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
      document.getElementById(tabName).classList.add('active');
      event.target.classList.add('active');
    }

    async function loadEmailAddresses() {
      try {
        const response = await fetch('/api/email-addresses', { headers: getAuthHeaders() });
        const emails = await response.json();
        document.getElementById('emailsList').innerHTML = emails.map(email =>
          \`<div style="display: flex; justify-content: space-between; align-items: center; background-color: #1e293b; padding: 0.75rem; border-radius: 0.25rem;">
            <div><div style="font-weight: 500;">\${email.email}</div><div style="font-size: 0.875rem; color: #94a3b8;">\${email.description || '(no description)'}</div></div>
            <button onclick="deleteEmailAddress(\${email.id})" style="background-color: #b91c1c; color: white; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.875rem; cursor: pointer; border: none;">Delete</button>
          </div>\`
        ).join('');
      } catch (error) {
        console.error('Error loading emails:', error);
      }
    }

    async function addEmailAddress(e) {
      e.preventDefault();
      const email = document.getElementById('emailInput').value;
      const description = document.getElementById('descriptionInput').value;
      try {
        await fetch('/api/email-addresses', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ email, description })
        });
        document.getElementById('emailInput').value = '';
        document.getElementById('descriptionInput').value = '';
        loadEmailAddresses();
      } catch (error) {
        console.error('Error adding email:', error);
      }
    }

    async function deleteEmailAddress(id) {
      try {
        await fetch(\`/api/email-addresses/\${id}\`, { method: 'DELETE', headers: getAuthHeaders() });
        loadEmailAddresses();
      } catch (error) {
        console.error('Error deleting email:', error);
      }
    }

    async function loadWebhooks() {
      try {
        const response = await fetch('/api/webhooks', { headers: getAuthHeaders() });
        const webhooks = await response.json();
        document.getElementById('webhooksList').innerHTML = webhooks.map(webhook =>
          \`<div style="display: flex; justify-content: space-between; align-items: center; background-color: #1e293b; padding: 0.75rem; border-radius: 0.25rem;">
            <div><div style="font-weight: 500;">\${webhook.url}</div><div style="font-size: 0.875rem; color: #94a3b8;">\${webhook.method}</div></div>
            <button onclick="deleteWebhook(\${webhook.id})" style="background-color: #b91c1c; color: white; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.875rem; cursor: pointer; border: none;">Delete</button>
          </div>\`
        ).join('');
      } catch (error) {
        console.error('Error loading webhooks:', error);
      }
    }

    async function addWebhook(e) {
      e.preventDefault();
      const url = document.getElementById('webhookUrlInput').value;
      const method = document.getElementById('methodInput').value;
      try {
        await fetch('/api/webhooks', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ url, method })
        });
        document.getElementById('webhookUrlInput').value = '';
        loadWebhooks();
      } catch (error) {
        console.error('Error adding webhook:', error);
      }
    }

    async function deleteWebhook(id) {
      try {
        await fetch(\`/api/webhooks/\${id}\`, { method: 'DELETE', headers: getAuthHeaders() });
        loadWebhooks();
      } catch (error) {
        console.error('Error deleting webhook:', error);
      }
    }

    async function loadRoutingRules() {
      try {
        const response = await fetch('/api/routing-rules', { headers: getAuthHeaders() });
        const rules = await response.json();
        document.getElementById('rulesList').innerHTML = rules.map(rule =>
          \`<div style="display: flex; justify-content: space-between; align-items: center; background-color: #1e293b; padding: 0.75rem; border-radius: 0.25rem;">
            <div><div style="font-weight: 500;">\${rule.name}</div><div style="font-size: 0.875rem; color: #94a3b8;">\${rule.email_id} → \${rule.webhook_id}</div></div>
            <button onclick="deleteRoutingRule(\${rule.id})" style="background-color: #b91c1c; color: white; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.875rem; cursor: pointer; border: none;">Delete</button>
          </div>\`
        ).join('');
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
        await fetch('/api/routing-rules', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name, email_id, webhook_id })
        });
        document.getElementById('ruleNameInput').value = '';
        loadRoutingRules();
      } catch (error) {
        console.error('Error adding rule:', error);
      }
    }

    async function deleteRoutingRule(id) {
      try {
        await fetch(\`/api/routing-rules/\${id}\`, { method: 'DELETE', headers: getAuthHeaders() });
        loadRoutingRules();
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
