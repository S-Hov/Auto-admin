import type mysql from "mysql2/promise";

export type MySqlDbExecuter = mysql.Pool | mysql.PoolConnection;