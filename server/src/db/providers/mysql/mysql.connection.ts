import type {
    DatabaseConnection,
    DatabaseExecutor,
} from "../../contracts/executor.interface";
import { MySqlDatabaseExecutor } from "./mysql.executor";
import type mysql from "mysql2/promise";

export class MySqlDatabaseConnection
    extends MySqlDatabaseExecutor
    implements DatabaseConnection
{
    private readonly connection: mysql.PoolConnection;
    private discarded = false;

    constructor(connection: mysql.PoolConnection) {
        super(connection);
        this.connection = connection;
    }

    discard(): void {
        if (this.discarded) return;
        this.discarded = true;
        this.connection.destroy();
    }

    release(): void {
        if (!this.discarded) this.connection.release();
    }

    async transaction<T>(
        callback: (executor: DatabaseExecutor) => Promise<T>,
    ): Promise<T> {
        await this.connection.beginTransaction();
        try {
            const result = await callback(this);

            await this.connection.commit();

            return result;
        } catch (error) {
            try {
                await this.connection.rollback();
            } catch (rollbackError) {
                throw new AggregateError(
                    [error, rollbackError],
                    "Transaction failed",
                );
            }

            throw error;
        }
    }
}
