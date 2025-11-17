import { Pool } from 'pg';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

class DatabaseRouter {
  constructor(databaseUrl) {
    this.pool = new Pool({
      connectionString: databaseUrl,
    });
  }

  async loadRoutingRules() {
    try {
      const query = `
        SELECT
          rr.id,
          rr.name,
          ea.email,
          w.url
        FROM routing_rules rr
        JOIN email_addresses ea ON rr.email_id = ea.id
        JOIN webhooks w ON rr.webhook_id = w.id
        WHERE ea.status = 'active'
        ORDER BY rr.id ASC
      `;

      const result = await this.pool.query(query);
      logger.info(`Loaded ${result.rows.length} routing rules from database`);

      // Convert database rows to WebhookRouter rule format
      const rules = result.rows.map((row) => ({
        name: row.name || `Rule ${row.id}`,
        priority: row.id, // Use ID as priority
        conditions: {
          to: row.email, // Match emails sent to this address
        },
        webhook: row.url,
      }));

      return rules;
    } catch (error) {
      logger.error('Failed to load routing rules from database:', error);
      return [];
    }
  }

  async close() {
    await this.pool.end();
  }
}

export default DatabaseRouter;
