import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import installRouter from './modules/install/install.routes';
import { logger } from './shared/middleware/logger';
import { errorHandler } from './shared/middleware/errorHandler';

dotenv.config();

const app = express();

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
]

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

app.use(logger);

app.use('/api/install', installRouter);

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
