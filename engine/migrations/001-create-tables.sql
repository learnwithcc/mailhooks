-- Drop old tables if they exist (for schema migration)
DROP TABLE IF EXISTS routing_rules CASCADE;
DROP TABLE IF EXISTS webhook_destinations CASCADE;
DROP TABLE IF EXISTS email_addresses CASCADE;

-- Create email_addresses table
CREATE TABLE email_addresses (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create webhooks table
CREATE TABLE webhooks (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  method VARCHAR(10) NOT NULL DEFAULT 'POST',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create routing_rules table
CREATE TABLE routing_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email_id INTEGER NOT NULL REFERENCES email_addresses(id) ON DELETE CASCADE,
  webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(email_id, webhook_id)
);

-- Create indexes
CREATE INDEX idx_email_addresses_status ON email_addresses(status);
CREATE INDEX idx_routing_rules_email_id ON routing_rules(email_id);
CREATE INDEX idx_routing_rules_webhook_id ON routing_rules(webhook_id);
