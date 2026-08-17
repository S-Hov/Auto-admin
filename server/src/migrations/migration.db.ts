import mysql, { type Connection } from "mysql2/promise";
import { getEnvConnectionParams } from "../db";

export async function createMigrationConnection(): Promise<Connection> {
    const { host, port, user, password, database } = getEnvConnectionParams();

    return await mysql.createConnection({
        host,
        port,
        user,
        password,
        database,
        supportBigNumbers: true,
        bigNumberStrings: false,
        // multipleStatements: true,
    });
}