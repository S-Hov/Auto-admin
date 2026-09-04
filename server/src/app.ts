import express from 'express';
import cors from 'cors';
import { errorHandler } from './shared/middleware/errorHandler';
import cookieParser from 'cookie-parser';
import ApiRouter from './routes/ApiRouter';
import { resetPool } from './db';
import { envConfig } from './config/env';
import { httpLogger } from './shared/middleware/logger';
import { logger } from './shared/logger';

import './services';

const app = express();

const defaultAllowedOrigins = envConfig.Auto_Admin__CORS_ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()) ?? [];
const nodeEnv = process.env.Auto_Admin__NODE_ENV;

if (nodeEnv === 'development') {
  for (let i = 5173; i <= 5179; i++) {
    defaultAllowedOrigins.push(`http://localhost:${i}`);
  }
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || defaultAllowedOrigins.includes(origin)) {
      callback(null, true)
      return
    };

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '64kb' }));

app.use(cookieParser());

app.use(httpLogger);

app.use('/api', ApiRouter)

app.use(errorHandler);

const PORT = envConfig.Auto_Admin__PORT;
const HOST = envConfig.Auto_Admin__HOST;

const server = app.listen(PORT, HOST, () => {
  logger.info({
    PORT,
    HOST
  }, `Server started on http://${HOST}:${PORT}`);
});

server.requestTimeout = 30000;
server.keepAliveTimeout = 30000;
server.headersTimeout = 35000;

let isShuttingDown = false

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({
    signal
  }, `Received ${signal}, closing gracefully...`);

  server.close(async () => {
    try {
      await resetPool();
      logger.info({
        service: 'db-cleanup',
      }, `Database connection closed`);

      logger.info({
        service: 'server-shutdown',
      }, 'Server closed');
      process.exit(0);
    }
    catch (error) {
      logger.fatal({
        service: 'db-cleanup',
        error: error
      }, `Error during DB cleanup`);
      process.exit(1);
    }
  })

  // Аварийный таймер на 10 сек (если какой-то запрос завис)
  setTimeout(() => {
    logger.fatal({
      service: 'timeout',
    }, `Forceful shutdown due to timeout`);
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.fatal({
    service: 'unhandled-rejection',
    reason: reason
  }, `Unhandled rejection at ${reason}`);
})
process.on('uncaughtException', (error) => {
  logger.fatal({
    service: 'uncaught-exception',
    error: error
  }, `Uncaught exception at ${error}`);
  process.exit(1);
})