import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

const dbConfig = {
  host: process.env.TARGET_DB_HOST || 'localhost',
  port: Number(process.env.TARGET_DB_PORT) || 3306,
  user: process.env.TARGET_DB_USER || 'root',
  password: process.env.TARGET_DB_PASSWORD || 'root',
  database: process.env.TARGET_DB_NAME || 'auto_admin_test',
};

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'auto-admin-server',
  });
});

app.get('/api/db-test', async (_req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query('SELECT DATABASE() as dbName');
    await connection.end();

    res.json({
      ok: true,
      rows,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
