import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export type DbExecutor = mysql.Pool | mysql.PoolConnection;

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

export async function withTransaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
    const connection = await getPool().getConnection();

    try {
        await connection.beginTransaction();

        const result = await callback(connection);

        await connection.commit();

        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}