import mysql, { type Connection } from "mysql2/promise";
import { getEnvConnectionParams } from "../db";
import { envConfig } from "../config/env";

export async function createMigrationConnection(): Promise<Connection> {
    const { host, port, user, password, database } = getEnvConnectionParams();

    return await mysql.createConnection({
        host,
        port,
        user,
        password,
        database,
        connectTimeout: envConfig.Auto_Admin__DB_CONNECT_TIMEOUT_MS,
        supportBigNumbers: true,
        bigNumberStrings: false,
        // multipleStatements: true,
    });
}
