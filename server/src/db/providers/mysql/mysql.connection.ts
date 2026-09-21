import { logger } from "../../../shared/logger";
import type {
    DatabaseConnection,
    DatabaseExecutor,
} from "../../database-executor.interface";
import { MySqlDatabaseExecutor } from "./mysql.executor";
import type mysql from "mysql2/promise";

export class MySqlDatabaseConnection
    extends MySqlDatabaseExecutor
    implements DatabaseConnection
{
    private readonly pool: mysql.PoolConnection;

    constructor(pool: mysql.PoolConnection) {
        super(pool);
        this.pool = pool;
    }

    async transaction<T>(
        callback: (executor: DatabaseExecutor) => Promise<T>,
    ): Promise<T> {
        try {
            await this.pool.beginTransaction();

            const result = await callback(this);

            await this.pool.commit();

            return result;
        } catch (error) {
            try {
                await this.pool.rollback();
            } catch (rollbackError) {
                logger.fatal({
                    service: "database",
                }, `Не удалось откатить транзакцию, ${rollbackError}`)
            }

            throw error;
        }
    }
}
