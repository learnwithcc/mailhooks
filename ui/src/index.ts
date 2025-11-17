import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { Pool } from 'pg';

const app = new Hono();

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
});

// Middleware: API Key authentication
app.use('/api/*', async (c, next) => {
  const apiKey = c.req.header('x-api-key');
  const expectedKey = process.env.API_KEY;

  if (apiKey !== expectedKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
});

// Serve static files (HTML, CSS)
app.get('/', async (c) => {
  return c.html(await getIndexHtml());
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
    <h1 class="text-3xl font-bold mb-8">Mail Hooks Management</h1>

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
    const API_KEY = '${process.env.API_KEY || 'demo-key'}';

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
          headers: { 'x-api-key': API_KEY }
        });
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
          headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
          body: JSON.stringify({ email, description })
        });
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
          headers: { 'x-api-key': API_KEY }
        });
        if (response.ok) loadEmailAddresses();
      } catch (error) {
        console.error('Error deleting email:', error);
      }
    }

    async function loadWebhooks() {
      try {
        const response = await fetch('/api/webhooks', {
          headers: { 'x-api-key': API_KEY }
        });
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
          headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
          body: JSON.stringify({ url, method })
        });
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
          headers: { 'x-api-key': API_KEY }
        });
        if (response.ok) loadWebhooks();
      } catch (error) {
        console.error('Error deleting webhook:', error);
      }
    }

    async function loadRoutingRules() {
      try {
        const response = await fetch('/api/routing-rules', {
          headers: { 'x-api-key': API_KEY }
        });
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
          headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
          body: JSON.stringify({ name, email_address_id, webhook_destination_id })
        });
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
          headers: { 'x-api-key': API_KEY }
        });
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
}, (info) => {
  console.log(`Mail Hooks UI running on http://localhost:${info.port}`);
});
