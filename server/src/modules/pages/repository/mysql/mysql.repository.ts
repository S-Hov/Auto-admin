import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import type { CreatePageData } from "../../schema/page-create.schema";
import type { PageRepository } from "../repository.interface";

export class MySqlPageRepository implements PageRepository {
    constructor(private readonly executor: DatabaseExecutor) {}
    async create(config: CreatePageData, userId: number): Promise<number> {
        const result = await this.executor.execute(
            `
                INSERT INTO Auto_Admin__pages
                    (name, description, config, revision, created_by, updated_by)
                VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                config.name,
                config.description,
                JSON.stringify(config.config),
                1,
                userId,
                userId,
            ],
        );
        const id = Number(result.insertId);
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new Error("Database did not return a created menu id");
        }
        else {}

        return id;
    }
}
