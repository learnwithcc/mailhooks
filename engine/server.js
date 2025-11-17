import { createRequire } from 'module';
import Queue from 'better-queue';
import winston from 'winston';
import 'winston-daily-rotate-file';
import DatabaseRouter from './services/databaseRouter.js';

const require = createRequire(import.meta.url);
const SMTPServer = require('smtp-server').SMTPServer;
const { parseEmail } = require('./node_modules/inbound-email/services/emailParser');
const WebhookRouter = require('./node_modules/inbound-email/services/webhookRouter');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d'
    })
  ]
});

// Load database routing rules
const databaseRouter = new DatabaseRouter(process.env.DATABASE_URL);
let loadedRules = [];
let webhookRouter = null;

// Module-level config object - initialized with defaults and updated by reloadRoutingRules()
let config = {
  WEBHOOK_URL: process.env.WEBHOOK_URL || 'https://enkhprqr4n2t.x.pipedream.net/',
  WEBHOOK_RULES: [],
  PORT: process.env.PORT || 25,
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024,
  BUCKET_NAME: process.env.S3_BUCKET_NAME,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  WEBHOOK_CONCURRENCY: process.env.WEBHOOK_CONCURRENCY || 5,
  LOCAL_STORAGE_PATH: process.env.LOCAL_STORAGE_PATH || './temp-attachments',
  LOCAL_STORAGE_RETENTION: process.env.LOCAL_STORAGE_RETENTION || 24,
  S3_RETRY_INTERVAL: process.env.S3_RETRY_INTERVAL || 5,
};

async function reloadRoutingRules() {
  try {
    loadedRules = await databaseRouter.loadRoutingRules();
    logger.info(`Reloaded ${loadedRules.length} routing rules from database`);

    // Update the module-level config object with fresh rules
    config.WEBHOOK_RULES = loadedRules;

    // Update the global webhook router with fresh rules
    webhookRouter = new WebhookRouter(config);
    return true;
  } catch (error) {
    logger.error('Failed to reload routing rules from database:', error);
    return false;
  }
}

// Load rules on startup
await reloadRoutingRules();

// Reload rules every 30 seconds so UI changes are picked up quickly
setInterval(async () => {
  const success = await reloadRoutingRules();
  if (!success) {
    logger.warn('Failed to reload routing rules in periodic check');
  }
}, 30000);

const webhookQueue = new Queue(async function (parsed, cb) {
  const maxRetries = 3;
  let retries = 0;

  const attemptWebhook = async () => {
    try {
      // Route email using database rules
      const matchedWebhooks = webhookRouter.route(parsed);

      if (matchedWebhooks.length === 0) {
        throw new Error('No webhook endpoints found for this email');
      }

      const results = [];
      const errors = [];

      // Send to all matched webhooks
      for (const match of matchedWebhooks) {
        try {
          logger.info(`Sending to webhook: ${match.webhook} (rule: ${match.ruleName})`);

          const axios = require('axios');
          const response = await axios.post(match.webhook, {
            ...parsed,
            _webhookMeta: {
              ruleName: match.ruleName,
              priority: match.priority,
              webhook: match.webhook
            }
          }, {
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'inbound-email-service/1.0'
            }
          });

          results.push({
            webhook: match.webhook,
            ruleName: match.ruleName,
            status: response.status,
            success: true
          });

          logger.info(`Successfully sent to ${match.webhook} (${response.status})`);

        } catch (error) {
          const errorInfo = {
            webhook: match.webhook,
            ruleName: match.ruleName,
            success: false,
            error: error.message,
            status: error.response?.status || null
          };

          results.push(errorInfo);
          errors.push(errorInfo);

          logger.error(`Failed to send to ${match.webhook}:`, {
            error: error.message,
            status: error.response?.status,
            data: error.response?.data
          });
        }
      }

      // If all webhooks failed, throw an error
      if (errors.length === matchedWebhooks.length) {
        throw new Error(`All ${matchedWebhooks.length} webhook(s) failed`);
      }

      logger.info('Successfully sent to webhook');
      cb(null);
    } catch (error) {
      logger.error('Webhook error:', { message: error.message, stack: error.stack });
      if (retries < maxRetries) {
        retries++;
        logger.info(`Retrying webhook (attempt ${retries}/${maxRetries})`);
        setTimeout(attemptWebhook, 1000 * retries);
      } else {
        cb(error);
      }
    }
  };

  attemptWebhook();
}, { concurrent: config.WEBHOOK_CONCURRENCY || 5 });

const server = new SMTPServer({
  onData(stream, session, callback) {
    parseEmail(stream)
      .then(parsed => {
        webhookQueue.push(parsed);
        logger.info('Email added to queue', { queueSize: webhookQueue.getStats().total });
        callback();
      })
      .catch(error => {
        logger.error('Parsing error:', { message: error.message, stack: error.stack });
        callback(new Error('Failed to parse email'));
      });
  },
  onError(error) {
    logger.error('SMTP server error:', { message: error.message, stack: error.stack });
  },
  disabledCommands: ['AUTH'],
  secure: config.SMTP_SECURE
});

server.listen(config.PORT, '0.0.0.0', err => {
  if (err) {
    logger.error('Failed to start SMTP server:', { message: err.message, stack: err.stack });
    process.exit(1);
  }
  logger.info(`SMTP server listening on port ${config.PORT} on all interfaces`);
});

function gracefulShutdown(reason) {
  logger.info(`Shutting down: ${reason}`);
  server.close(() => {
    logger.info('Server closed. Exiting process.');
    process.exit(0);
  });
}

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', { message: err.message, stack: err.stack });
  gracefulShutdown('Uncaught exception');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason: reason, promise: promise });
  gracefulShutdown('Unhandled rejection');
});

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM signal received');
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT signal received');
});
