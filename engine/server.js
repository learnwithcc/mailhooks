import SMTPServer from 'smtp-server';
import { parseEmail } from './node_modules/inbound-email/services/emailParser.js';
import { sendToWebhook } from './node_modules/inbound-email/services/webhookService.js';
import WebhookRouter from './node_modules/inbound-email/services/webhookRouter.js';
import Queue from 'better-queue';
import winston from 'winston';
import 'winston-daily-rotate-file';
import DatabaseRouter from './services/databaseRouter.js';

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

try {
  loadedRules = await databaseRouter.loadRoutingRules();
  logger.info(`Successfully loaded ${loadedRules.length} routing rules from database`);
} catch (error) {
  logger.error('Failed to load routing rules from database:', error);
  loadedRules = [];
}

// Create config with database rules as WEBHOOK_RULES
const config = {
  WEBHOOK_URL: process.env.WEBHOOK_URL || 'https://enkhprqr4n2t.x.pipedream.net/',
  WEBHOOK_RULES: loadedRules,
  PORT: process.env.PORT || 25,
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024,
  BUCKET_NAME: process.env.S3_BUCKET_NAME,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  WEBHOOK_CONCURRENCY: process.env.WEBHOOK_CONCURRENCY || 5,
  LOCAL_STORAGE_PATH: process.env.LOCAL_STORAGE_PATH || './temp-attachments',
  LOCAL_STORAGE_RETENTION: process.env.LOCAL_STORAGE_RETENTION || 24,
  S3_RETRY_INTERVAL: process.env.S3_RETRY_INTERVAL || 5,
};

// Initialize WebhookRouter with database rules
const webhookRouter = new WebhookRouter(config);
logger.info(`WebhookRouter initialized with ${loadedRules.length} rules from database`);

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

          const axios = (await import('axios')).default;
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

const server = new SMTPServer.SMTPServer({
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
