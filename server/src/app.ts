import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './shared/middleware/logger';
import { errorHandler } from './shared/middleware/errorHandler';
import cookieParser from 'cookie-parser';
import ApiRouter from './routes/ApiRouter';

dotenv.config();

const app = express();

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://localhost:5177',
  'http://127.0.0.1:5177',
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

app.use(cookieParser());

app.use(logger);

app.use('/api', ApiRouter)

app.use(errorHandler);

const PORT = Number(process.env.Auto_Admin__PORT) || 3000;
const HOST = process.env.Auto_Admin__HOST || 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Server started on http://${HOST}:${PORT}`);
});
