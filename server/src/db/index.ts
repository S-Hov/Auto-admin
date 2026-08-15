import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export type DbExecutor = mysql.Pool | mysql.PoolConnection;

export function getPool() {
    if (pool) {
        return pool;
    }

    const { host, port, user, password, database } = getEnvConnectionParams();

    try {
        pool = mysql.createPool({
            host,
            port,
            user,
            password,
            database,
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

export function getEnvConnectionParams(): {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
} {
    const host = process.env.Auto_Admin__DB_HOST;
    const port = process.env.Auto_Admin__DB_PORT;
    const user = process.env.Auto_Admin__DB_USERNAME;
    const password = process.env.Auto_Admin__DB_PASSWORD;
    const database = process.env.Auto_Admin__DB_DATABASE;

    if (!host || !port || !user || !database) {
        throw new Error('Missing database connection data');
    }

    return {
        host,
        port: Number(port),
        user,
        password: password || '',
        database,
    }
}