import express from 'express';
import cors from 'cors';
import { logger } from './shared/middleware/logger';
import { errorHandler } from './shared/middleware/errorHandler';
import cookieParser from 'cookie-parser';
import ApiRouter from './routes/ApiRouter';
import { resetPool } from './db';
import { envConfig } from './config/env';

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

app.use(express.json());

app.use(cookieParser());

app.use(logger);

app.use('/api', ApiRouter)

app.use(errorHandler);

const PORT = envConfig.Auto_Admin__PORT;
const HOST = envConfig.Auto_Admin__HOST;

const server = app.listen(PORT, HOST, () => {
  console.log(`Server started on http://${HOST}:${PORT}`);
});

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing gracefully...`);

  server.close(async () => {
    try {
      await resetPool();
      console.log('Database connection closed');

      console.log('Server closed');
      process.exit(0);
    }
    catch (error) {
      console.error('Error during DB cleanup:', error);
      process.exit(1);
    }
  })

  // Аварийный таймер на 10 сек (если какой-то запрос завис)
  setTimeout(() => {
    console.error('Forceful shutdown due to timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));