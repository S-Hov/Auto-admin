import { describe, expect, it, vi } from "vitest";
import type { DatabaseExecutor } from "../../../db/database-executor.interface";
import { UnsupportedDatabaseSubsystemError } from "../../../db/database.errors";
import { MySqlAuthRepository } from "./mysql/mysql.repository";
import { createAuthRepository } from "./repository.factory";

const executor = {
    queryRows: vi.fn(),
    execute: vi.fn(),
} as unknown as DatabaseExecutor;

describe("createAuthRepository", () => {
    it("creates the MySQL implementation", () => {
        expect(createAuthRepository("mysql", executor)).toBeInstanceOf(
            MySqlAuthRepository,
        );
    });

    it("does not silently fall back to MySQL", () => {
        expect(() => createAuthRepository("postgresql", executor)).toThrow(
            UnsupportedDatabaseSubsystemError,
        );
        expect(() => createAuthRepository("sqlite", executor)).toThrow(
            UnsupportedDatabaseSubsystemError,
        );
    });
});
