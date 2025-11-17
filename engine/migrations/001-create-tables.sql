-- Create email_addresses table
CREATE TABLE IF NOT EXISTS email_addresses (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create webhook_destinations table
CREATE TABLE IF NOT EXISTS webhook_destinations (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  method VARCHAR(10) NOT NULL DEFAULT 'POST',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create routing_rules table
CREATE TABLE IF NOT EXISTS routing_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email_address_id INTEGER NOT NULL REFERENCES email_addresses(id) ON DELETE CASCADE,
  webhook_destination_id INTEGER NOT NULL REFERENCES webhook_destinations(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(email_address_id, webhook_destination_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_addresses_status ON email_addresses(status);
CREATE INDEX IF NOT EXISTS idx_webhook_destinations_status ON webhook_destinations(status);
CREATE INDEX IF NOT EXISTS idx_routing_rules_status ON routing_rules(status);
CREATE INDEX IF NOT EXISTS idx_routing_rules_email_id ON routing_rules(email_address_id);
CREATE INDEX IF NOT EXISTS idx_routing_rules_webhook_id ON routing_rules(webhook_destination_id);
