import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), ".Auto-Admin.env") });

let pool: mysql.Pool | null = null;

export function getPool() {
    if (pool) {
        return pool;
    }

    try {
        pool = mysql.createPool({
            host: process.env.Auto_Admin__DB_HOST,
            port: Number(process.env.Auto_Admin__DB_PORT),
            user: process.env.Auto_Admin__DB_USERNAME,
            password: process.env.Auto_Admin__DB_PASSWORD,
            database: process.env.Auto_Admin__DB_DATABASE,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            multipleStatements: true,
            supportBigNumbers: true,
            bigNumberStrings: false,
        });

        return pool;
    }
    catch (error) {
        console.error('Error connecting to the database:', error);
        throw error;
    }
}

export async function resetPool() {
    if (!pool) {
        return;
    }

    await pool.end();
    pool = null;
}
