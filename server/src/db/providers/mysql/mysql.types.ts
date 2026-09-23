import type mysql from "mysql2/promise";

export type MySqlDbExecutor = mysql.Pool | mysql.PoolConnection | mysql.Connection;