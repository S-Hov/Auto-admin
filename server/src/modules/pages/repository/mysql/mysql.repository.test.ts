import { describe, expect, it, vi } from 'vitest';
import type { DatabaseExecutor } from '../../../../db/contracts/executor.interface';
import { pageData } from '../../../../../tests/fixtures/page.fixture';
import { MySqlPageRepository } from './mysql.repository';

function harness(insertId: number | string | null = 42) {
    const execute = vi.fn<DatabaseExecutor['execute']>(async () => ({ affectedRows: 1, insertId }));
    const queryRows = vi.fn<DatabaseExecutor['queryRows']>();
    const executor: DatabaseExecutor = { queryRows, execute };
    return { execute, queryRows, repository: new MySqlPageRepository(executor) };
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

describe('MySqlPageRepository.get', () => {
    it('reads a page by a bound ID with the API field name pageId', async () => {
        const h = harness();
        const page = { ...pageData(), pageId: 42, revision: 1 };
        h.queryRows.mockResolvedValue([page]);
        await expect(h.repository.get(42)).resolves.toEqual(page);
        const [sql, params] = h.queryRows.mock.calls[0];
        expect(sql).toMatch(/id\s+as\s+pageId/i);
        expect(sql).toMatch(/WHERE\s+id\s*=\s*\?/i);
        expect(params).toEqual([42]);
        expect(h.execute).not.toHaveBeenCalled();
    });

    it('returns explicit null when the page does not exist', async () => {
        const h = harness();
        h.queryRows.mockResolvedValue([]);
        await expect(h.repository.get(42)).resolves.toBeNull();
    });

    it('decodes a JSON string returned by the driver before validating config', async () => {
        const h = harness();
        const page = { ...pageData(), pageId: 42, revision: 1 };
        h.queryRows.mockResolvedValue([{ ...page, config: JSON.stringify(page.config) }]);
        await expect(h.repository.get(42)).resolves.toEqual(page);
    });

    it.each([
        null,
        { schemaVersion: 2 },
        { ...pageData().config, source: { resourceId: 0, recordKey: null } },
        { ...pageData().config, list: { ...pageData().config.list, columns: ['missing'] } },
        '{broken-json',
    ])('rejects corrupt or unsupported saved config: %j', async (config) => {
        const h = harness();
        h.queryRows.mockResolvedValue([{ ...pageData(), pageId: 42, revision: 1, config }]);
        await expect(h.repository.get(42)).rejects.toThrow();
    });

    it('preserves query failures', async () => {
        const h = harness();
        const error = new Error('Read unavailable');
        h.queryRows.mockRejectedValue(error);
        await expect(h.repository.get(42)).rejects.toBe(error);
    });
});

describe('MySqlPageRepository.appendAudit', () => {
    it.each(['create', 'update', 'delete'] as const)('writes a parameterized %s audit with JSON snapshots', async (action) => {
        const h = harness();
        const previous = action === 'create' ? null : { ...pageData(), pageId: 42, revision: 1 };
        const next = action === 'delete' ? null : { ...pageData(), pageId: 42, revision: 2 };
        await expect(h.repository.appendAudit(42, action, 7, previous, next, 'request-1')).resolves.toBeUndefined();
        const [sql, params] = h.execute.mock.calls[0];
        expect(sql.replace(/\s+/g, ' ')).toContain('INSERT INTO Auto_Admin__page_audit_events (page_id, action, actor_user_id, previous_value, new_value, request_id) VALUES (?, ?, ?, ?, ?, ?)');
        expect(params).toEqual([42, action, 7, JSON.stringify(previous), JSON.stringify(next), 'request-1']);
    });

    it('stores a missing request ID as SQL null', async () => {
        const h = harness();
        await h.repository.appendAudit(42, 'create', 7, null, pageData(), null);
        expect(h.execute.mock.calls[0][1]?.[5]).toBeNull();
    });

    it('propagates audit insert errors to the transaction owner', async () => {
        const h = harness();
        const error = new Error('Audit table unavailable');
        h.execute.mockRejectedValue(error);
        await expect(h.repository.appendAudit(42, 'create', 7, null, pageData(), null)).rejects.toBe(error);
    });
});
