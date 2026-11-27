import { describe, expect, it, vi } from 'vitest';
import type { DatabaseExecutor } from '../../../db/contracts/executor.interface';
import { UnsupportedDatabaseSubsystemError } from '../../../db/errors/database.errors';
import { MySqlPageRepository } from './mysql/mysql.repository';
import { createPageRepository } from './repository.factory';

const executor: DatabaseExecutor = { queryRows: vi.fn(), execute: vi.fn() };

describe('createPageRepository', () => {
    it('selects the MySQL implementation', () => {
        expect(createPageRepository('mysql', executor)).toBeInstanceOf(MySqlPageRepository);
    });
    it.each(['postgresql', 'sqlite'] as const)('rejects unsupported %s without a fallback', (type) => {
        expect(() => createPageRepository(type, executor)).toThrow(UnsupportedDatabaseSubsystemError);
    });
});
