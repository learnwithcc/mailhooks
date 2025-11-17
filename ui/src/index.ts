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

// Middleware: Session authentication for API routes
app.use('/api/*', async (c, next) => {
  const sessionToken = getSessionFromRequest(c);

  if (!sessionToken || !isValidSession(sessionToken)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
});

// Login route
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

// Serve login page or main UI based on session
app.get('/', async (c) => {
  const sessionToken = getSessionFromRequest(c);

  if (sessionToken && isValidSession(sessionToken)) {
    return c.html(await getIndexHtml());
  }

  return c.html(await getLoginHtml());
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

app.patch('/api/email-addresses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { status, description } = await c.req.json();

    const result = await pool.query(
      'UPDATE email_addresses SET status = COALESCE($1, status), description = COALESCE($2, description), updated_at = NOW() WHERE id = $3 RETURNING *',
      [status, description, id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Not found' }, 404);
    }

    return c.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating email address:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

app.delete('/api/email-addresses/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await pool.query('DELETE FROM email_addresses WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return c.json({ error: 'Not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting email address:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

// API Routes: Webhook Destinations
app.get('/api/webhooks', async (c) => {
  try {
    const result = await pool.query(
      'SELECT id, url, method, status, description, created_at FROM webhook_destinations ORDER BY created_at DESC'
    );
    return c.json(result.rows);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

app.post('/api/webhooks', async (c) => {
  try {
    const { url, method = 'POST', description } = await c.req.json();

    if (!url) {
      return c.json({ error: 'URL is required' }, 400);
    }

    const result = await pool.query(
      'INSERT INTO webhook_destinations (url, method, status, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [url, method, 'active', description || '']
    );

    return c.json(result.rows[0], 201);
  } catch (error) {
    console.error('Error creating webhook:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

app.patch('/api/webhooks/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { status, description } = await c.req.json();

    const result = await pool.query(
      'UPDATE webhook_destinations SET status = COALESCE($1, status), description = COALESCE($2, description), updated_at = NOW() WHERE id = $3 RETURNING *',
      [status, description, id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Not found' }, 404);
    }

    return c.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating webhook:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

app.delete('/api/webhooks/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await pool.query('DELETE FROM webhook_destinations WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return c.json({ error: 'Not found' }, 404);
    }

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
      'SELECT id, name, email_address_id, webhook_destination_id, status, created_at FROM routing_rules ORDER BY created_at DESC'
    );
    return c.json(result.rows);
  } catch (error) {
    console.error('Error fetching routing rules:', error);
    return c.json({ error: 'Database error' }, 500);
  }
});

app.post('/api/routing-rules', async (c) => {
  try {
    const { name, email_address_id, webhook_destination_id } = await c.req.json();

    if (!name || !email_address_id || !webhook_destination_id) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const result = await pool.query(
      'INSERT INTO routing_rules (name, email_address_id, webhook_destination_id, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email_address_id, webhook_destination_id, 'active']
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

    const result = await pool.query('DELETE FROM routing_rules WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return c.json({ error: 'Not found' }, 404);
    }

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

// Get login page HTML
async function getLoginHtml(): Promise<string> {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mail Hooks Login</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { @apply bg-slate-950 text-slate-100; }
  </style>
</head>
<body class="flex items-center justify-center min-h-screen p-4">
  <div class="w-full max-w-md">
    <div class="bg-slate-900 rounded-lg p-8 border border-slate-700">
      <h1 class="text-3xl font-bold mb-2">Mail Hooks</h1>
      <p class="text-slate-400 mb-8">Email Forwarding Management</p>

      <form onsubmit="handleLogin(event)" class="space-y-4">
        <div>
          <label for="apiKey" class="block text-sm font-medium mb-2">API Key</label>
          <input
            type="password"
            id="apiKey"
            placeholder="Enter your API key"
            required
            class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div id="errorMessage" class="hidden bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded text-sm"></div>

        <button
          type="submit"
          class="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium"
        >
          Login
        </button>
      </form>

      <p class="text-slate-400 text-xs text-center mt-6">
        Enter your API key to access the Mail Hooks management interface
      </p>
    </div>
  </div>

  <script>
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
          window.location.href = '/';
        } else {
          errorDiv.textContent = 'Invalid API key. Please try again.';
          errorDiv.classList.remove('hidden');
          document.getElementById('apiKey').value = '';
        }
      } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.classList.remove('hidden');
      }
    }
  </script>
</body>
</html>`;
}

// Get HTML content
async function getIndexHtml(): Promise<string> {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mail Hooks Management</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { @apply bg-slate-950 text-slate-100; }
    .nav-tab { @apply px-4 py-2 border-b-2 border-transparent cursor-pointer hover:border-slate-700; }
    .nav-tab.active { @apply border-blue-500; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
  </style>
</head>
<body class="p-6">
  <div class="max-w-6xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold">Mail Hooks Management</h1>
      <button onclick="logout()" class="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded">Logout</button>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex gap-4 border-b border-slate-700 mb-6">
      <div class="nav-tab active" onclick="switchTab('emails')">Email Addresses</div>
      <div class="nav-tab" onclick="switchTab('webhooks')">Webhook Destinations</div>
      <div class="nav-tab" onclick="switchTab('rules')">Routing Rules</div>
    </div>

    <!-- Email Addresses Tab -->
    <div id="emails" class="tab-content active">
      <div class="mb-6">
        <h2 class="text-xl font-semibold mb-4">Email Addresses</h2>
        <form onsubmit="addEmailAddress(event)" class="bg-slate-900 p-4 rounded mb-6">
          <div class="grid grid-cols-3 gap-4 mb-4">
            <input type="email" id="emailInput" placeholder="email@example.com" required class="bg-slate-800 px-3 py-2 rounded text-slate-100 placeholder-slate-500">
            <input type="text" id="descriptionInput" placeholder="Description (optional)" class="bg-slate-800 px-3 py-2 rounded text-slate-100 placeholder-slate-500">
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Add Email</button>
          </div>
        </form>
        <div id="emailsList" class="space-y-2"></div>
      </div>
    </div>

    <!-- Webhooks Tab -->
    <div id="webhooks" class="tab-content">
      <div class="mb-6">
        <h2 class="text-xl font-semibold mb-4">Webhook Destinations</h2>
        <form onsubmit="addWebhook(event)" class="bg-slate-900 p-4 rounded mb-6">
          <div class="grid grid-cols-4 gap-4 mb-4">
            <input type="url" id="webhookUrlInput" placeholder="https://example.com/webhook" required class="bg-slate-800 px-3 py-2 rounded text-slate-100 placeholder-slate-500 col-span-2">
            <select id="methodInput" class="bg-slate-800 px-3 py-2 rounded text-slate-100">
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
            </select>
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Add Webhook</button>
          </div>
        </form>
        <div id="webhooksList" class="space-y-2"></div>
      </div>
    </div>

    <!-- Routing Rules Tab -->
    <div id="rules" class="tab-content">
      <div class="mb-6">
        <h2 class="text-xl font-semibold mb-4">Routing Rules</h2>
        <form onsubmit="addRoutingRule(event)" class="bg-slate-900 p-4 rounded mb-6">
          <div class="grid grid-cols-4 gap-4 mb-4">
            <input type="text" id="ruleNameInput" placeholder="Rule name" required class="bg-slate-800 px-3 py-2 rounded text-slate-100 placeholder-slate-500">
            <select id="emailSelectInput" class="bg-slate-800 px-3 py-2 rounded text-slate-100"></select>
            <select id="webhookSelectInput" class="bg-slate-800 px-3 py-2 rounded text-slate-100"></select>
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Create Rule</button>
          </div>
        </form>
        <div id="rulesList" class="space-y-2"></div>
      </div>
    </div>
  </div>

  <script>
    function getSessionToken() {
      return localStorage.getItem('sessionToken');
    }

    function getAuthHeaders() {
      const token = getSessionToken();
      return {
        'x-session-token': token || '',
        'content-type': 'application/json'
      };
    }

    async function logout() {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: getAuthHeaders()
        });
      } catch (error) {
        console.error('Error logging out:', error);
      }
      localStorage.removeItem('sessionToken');
      window.location.href = '/';
    }

    function switchTab(tabName) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
      document.getElementById(tabName).classList.add('active');
      event.target.classList.add('active');

      if (tabName === 'emails') loadEmailAddresses();
      else if (tabName === 'webhooks') loadWebhooks();
      else if (tabName === 'rules') loadRoutingRules();
    }

    async function loadEmailAddresses() {
      try {
        const response = await fetch('/api/email-addresses', {
          headers: getAuthHeaders()
        });
        if (response.status === 401) {
          logout();
          return;
        }
        const emails = await response.json();
        const html = emails.map(e => \`
          <div class="bg-slate-900 p-3 rounded flex justify-between items-center">
            <div>
              <p class="font-mono text-sm">\${e.email}</p>
              <p class="text-slate-400 text-xs">\${e.description || 'No description'}</p>
            </div>
            <button onclick="deleteEmailAddress(\${e.id})" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm">Delete</button>
          </div>
        \`).join('');
        document.getElementById('emailsList').innerHTML = html || '<p class="text-slate-400">No email addresses configured</p>';
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
        if (response.status === 401) {
          logout();
          return;
        }
        if (response.ok) {
          document.getElementById('emailInput').value = '';
          document.getElementById('descriptionInput').value = '';
          loadEmailAddresses();
        }
      } catch (error) {
        console.error('Error adding email:', error);
      }
    }

    async function deleteEmailAddress(id) {
      try {
        const response = await fetch(\`/api/email-addresses/\${id}\`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (response.status === 401) {
          logout();
          return;
        }
        if (response.ok) loadEmailAddresses();
      } catch (error) {
        console.error('Error deleting email:', error);
      }
    }

    async function loadWebhooks() {
      try {
        const response = await fetch('/api/webhooks', {
          headers: getAuthHeaders()
        });
        if (response.status === 401) {
          logout();
          return;
        }
        const webhooks = await response.json();
        const html = webhooks.map(w => \`
          <div class="bg-slate-900 p-3 rounded flex justify-between items-center">
            <div class="flex-1 min-w-0">
              <p class="font-mono text-sm truncate">\${w.url}</p>
              <p class="text-slate-400 text-xs">\${w.method}</p>
            </div>
            <button onclick="deleteWebhook(\${w.id})" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm">Delete</button>
          </div>
        \`).join('');
        document.getElementById('webhooksList').innerHTML = html || '<p class="text-slate-400">No webhooks configured</p>';
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
        if (response.status === 401) {
          logout();
          return;
        }
        if (response.ok) {
          document.getElementById('webhookUrlInput').value = '';
          loadWebhooks();
        }
      } catch (error) {
        console.error('Error adding webhook:', error);
      }
    }

    async function deleteWebhook(id) {
      try {
        const response = await fetch(\`/api/webhooks/\${id}\`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (response.status === 401) {
          logout();
          return;
        }
        if (response.ok) loadWebhooks();
      } catch (error) {
        console.error('Error deleting webhook:', error);
      }
    }

    async function loadRoutingRules() {
      try {
        const response = await fetch('/api/routing-rules', {
          headers: getAuthHeaders()
        });
        if (response.status === 401) {
          logout();
          return;
        }
        const rules = await response.json();
        const html = rules.map(r => \`
          <div class="bg-slate-900 p-3 rounded flex justify-between items-center">
            <div>
              <p class="font-mono text-sm">\${r.name}</p>
              <p class="text-slate-400 text-xs">Email ID: \${r.email_address_id} → Webhook ID: \${r.webhook_destination_id}</p>
            </div>
            <button onclick="deleteRoutingRule(\${r.id})" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm">Delete</button>
          </div>
        \`).join('');
        document.getElementById('rulesList').innerHTML = html || '<p class="text-slate-400">No routing rules configured</p>';
      } catch (error) {
        console.error('Error loading rules:', error);
      }
    }

    async function addRoutingRule(e) {
      e.preventDefault();
      const name = document.getElementById('ruleNameInput').value;
      const email_address_id = document.getElementById('emailSelectInput').value;
      const webhook_destination_id = document.getElementById('webhookSelectInput').value;

      try {
        const response = await fetch('/api/routing-rules', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name, email_address_id, webhook_destination_id })
        });
        if (response.status === 401) {
          logout();
          return;
        }
        if (response.ok) {
          document.getElementById('ruleNameInput').value = '';
          loadRoutingRules();
        }
      } catch (error) {
        console.error('Error adding rule:', error);
      }
    }

    async function deleteRoutingRule(id) {
      try {
        const response = await fetch(\`/api/routing-rules/\${id}\`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (response.status === 401) {
          logout();
          return;
        }
        if (response.ok) loadRoutingRules();
      } catch (error) {
        console.error('Error deleting rule:', error);
      }
    }

    // Load initial data
    loadEmailAddresses();
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
