import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import type {
    InstallationStatus,
    InstallationStatusValue,
} from "../../install.types";
import type { InstallRepository } from "../repository.interface";

export class MySqlInstallRepository implements InstallRepository {
    constructor(private readonly executor: DatabaseExecutor) {}

    async updateInstallationStatus(
        newStatus: InstallationStatusValue,
    ): Promise<void> {
        await this.executor.execute(
            `
                INSERT INTO Auto_Admin__installation (id, status) 
                VALUES (1, ?) 
                ON DUPLICATE KEY UPDATE status = VALUES(status)
            `,
            [newStatus],
        );
    }

    async getInstallationStatusForUpdate(): Promise<
        InstallationStatus | undefined
    > {
        const [rows] = await this.executor.queryRows<InstallationStatus>(
            `
                SELECT status
                FROM Auto_Admin__installation
                WHERE id = 1
                FOR UPDATE
            `,
        );

        return rows;
    }

    async getInstallationStatus(): Promise<
        InstallationStatusValue | undefined
    > {
        const [rows] = await this.executor.queryRows<InstallationStatus>(
            `
                SELECT status
                FROM Auto_Admin__installation
                WHERE id = 1
                LIMIT 1
            `,
        );
        return rows?.status;
    }

    async markMigrationsCompleted(): Promise<void> {
        await this.executor.execute(
            `
                INSERT INTO Auto_Admin__installation (id, status)
                VALUES (1, 'migrated')
                ON DUPLICATE KEY UPDATE
                    status = CASE
                        WHEN Auto_Admin__installation.status = 'ready' THEN 'ready'
                        ELSE 'migrated'
                    END
            `,
        );
    }
}
