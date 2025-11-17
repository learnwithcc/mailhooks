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
      // First, check what email addresses exist and their statuses
      const emailsDebug = await this.pool.query(`
        SELECT id, email, status FROM email_addresses;
      `);
      logger.info(`Email addresses in database:`, {
        count: emailsDebug.rows.length,
        emails: emailsDebug.rows
      });

      // Then check routing rules
      const rulesDebug = await this.pool.query(`
        SELECT * FROM routing_rules;
      `);
      logger.info(`Routing rules in database:`, {
        count: rulesDebug.rows.length,
        rules: rulesDebug.rows
      });

      // Now run the actual query (without status filter for now)
      const query = `
        SELECT
          rr.id,
          rr.name,
          ea.email,
          ea.status,
          w.url
        FROM routing_rules rr
        JOIN email_addresses ea ON rr.email_id = ea.id
        JOIN webhooks w ON rr.webhook_id = w.id
        ORDER BY rr.id ASC
      `;

      const result = await this.pool.query(query);
      logger.info(`Loaded ${result.rows.length} routing rules from database`, {
        rules: result.rows
      });

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
