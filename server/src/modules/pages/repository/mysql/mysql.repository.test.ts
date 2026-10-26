import { describe, expect, it, vi } from 'vitest';
import type { DatabaseExecutor } from '../../../../db/contracts/executor.interface';
import { pageData } from '../../../../../tests/fixtures/page.fixture';
import { MySqlPageRepository } from './mysql.repository';

function harness(insertId: number | string | null = 42) {
    const execute = vi.fn<DatabaseExecutor['execute']>(async () => ({ affectedRows: 1, insertId }));
    const executor: DatabaseExecutor = { queryRows: vi.fn(), execute };
    return { execute, repository: new MySqlPageRepository(executor) };
}

describe('MySqlPageRepository.create', () => {
    it('stores the complete JSON and an independent initial revision using bound parameters', async () => {
        const h = harness();
        const data = { ...pageData(), name: "Заказы ' ?" };
        await expect(h.repository.create(data, 7)).resolves.toBe(42);
        const [sql, params] = h.execute.mock.calls[0];
        expect(sql.replace(/\s+/g, ' ')).toContain('(name, description, config, revision, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)');
        expect(sql).not.toContain(data.name);
        expect(params).toEqual([data.name, null, JSON.stringify(data.config), 1, 7, 7]);
    });

    it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null])('rejects an invalid inserted ID: %s', async (insertId) => {
        const h = harness(insertId);
        await expect(h.repository.create(pageData(), 7)).rejects.toThrow();
    });

    it('normalizes a safe numeric string ID allowed by DatabaseCommandResult', async () => {
        const h = harness('42');
        await expect(h.repository.create(pageData(), 7)).resolves.toBe(42);
    });

    it('propagates an insert failure', async () => {
        const h = harness();
        const error = new Error('Database unavailable');
        h.execute.mockRejectedValue(error);
        await expect(h.repository.create(pageData(), 7)).rejects.toBe(error);
    });
});
