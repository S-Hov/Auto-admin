import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import installRouter from './modules/install/install.routes';
import authRouter from './modules/auth/auth.routes';
import { logger } from './shared/middleware/logger';
import { errorHandler } from './shared/middleware/errorHandler';

dotenv.config();

dotenv.config({ path: path.join(process.cwd(), '.Auto-Admin.env') });

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

app.use(logger);

app.use("/api/install", installRouter);
app.use("/api/auth", authRouter);

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Server started on http://${HOST}:${PORT}`);
});
