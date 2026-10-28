import { describe, expect, it, vi } from 'vitest';
import type { DatabaseExecutor } from '../../../../db/contracts/executor.interface';
import { pageData } from '../../../../../tests/fixtures/page.fixture';
import { MySqlPageRepository } from './mysql.repository';
import { PageReferencedByMenuError } from '../../page.errors';

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

describe('MySqlPageRepository deletion', () => {
    it('locks the page for deletion and accepts an obsolete serialized config', async () => {
        const h = harness();
        const config = { schemaVersion: 999, legacy: true };
        const previous = { ...pageData(), pageId: 42, revision: 9, config };
        h.queryRows.mockResolvedValue([{ ...previous, config: JSON.stringify(config) }]);
        await expect(h.repository.getForDeletion(42)).resolves.toEqual(previous);
        const [sql, params] = h.queryRows.mock.calls[0];
        expect(sql).toMatch(/FROM\s+Auto_Admin__pages\s+WHERE\s+id\s*=\s*\?\s+FOR\s+UPDATE/i);
        expect(params).toEqual([42]);
    });

    it('returns null for a missing locked page', async () => {
        const h = harness();
        h.queryRows.mockResolvedValue([]);
        await expect(h.repository.getForDeletion(42)).resolves.toBeNull();
    });

    it.each([[], [{ id: 7 }]])('checks all menu references without filtering inactive items: %j', async (...rows) => {
        const h = harness();
        h.queryRows.mockResolvedValue(rows);
        await expect(h.repository.hasMenuReferences(42)).resolves.toBe(rows.length > 0);
        const [sql, params] = h.queryRows.mock.calls[0];
        expect(sql).toMatch(/FROM\s+Auto_Admin__menu\s+WHERE\s+page_id\s*=\s*\?/i);
        expect(sql).toMatch(/FOR\s+UPDATE/i);
        expect(sql).not.toMatch(/is_active/i);
        expect(params).toEqual([42]);
    });

    it('deletes only the requested page with a bound ID', async () => {
        const h = harness(null);
        await expect(h.repository.delete(42)).resolves.toBe(true);
        expect(h.execute).toHaveBeenCalledWith(expect.stringMatching(/DELETE FROM Auto_Admin__pages WHERE id = \?/), [42]);
    });

    it('returns false if no page was deleted', async () => {
        const h = harness();
        h.execute.mockResolvedValue({ affectedRows: 0, insertId: null });
        await expect(h.repository.delete(42)).resolves.toBe(false);
    });

    it('translates only the known menu foreign key error, preserving its cause', async () => {
        const h = harness();
        const error = Object.assign(new Error('Foreign key conflict'), {
            code: 'ER_ROW_IS_REFERENCED_2', sqlMessage: 'CONSTRAINT `fk_menu_page` FOREIGN KEY (`page_id`)',
        });
        h.execute.mockRejectedValue(error);
        await expect(h.repository.delete(42)).rejects.toBeInstanceOf(PageReferencedByMenuError);
        await expect(h.repository.delete(42)).rejects.toMatchObject({ cause: error });
    });

    it.each([
        new Error('Connection lost'),
        Object.assign(new Error('Other constraint'), { code: 'ER_ROW_IS_REFERENCED_2', sqlMessage: 'CONSTRAINT `another_fk`' }),
        Object.assign(new Error('fk_menu_page'), { code: 'ER_PARSE_ERROR' }),
    ])('preserves unrelated database failures: %s', async (error) => {
        const h = harness();
        h.execute.mockRejectedValue(error);
        await expect(h.repository.delete(42)).rejects.toBe(error);
    });
});

describe('MySqlPageRepository.update', () => {
    it('uses expected revision in the SQL condition, serializes config and increments revision in the database', async () => {
        const h = harness(0);
        const data = { ...pageData(), name: "Заказы ' ?", revision: 3 };
        const before = structuredClone(data);
        Object.freeze(data);
        await expect(h.repository.update(42, data, 7)).resolves.toBe(true);
        const [sql, params] = h.execute.mock.calls[0];
        expect(sql).toMatch(/revision\s*=\s*revision\s*\+\s*1/i);
        expect(sql).toMatch(/WHERE\s+id\s*=\s*\?\s+AND\s+revision\s*=\s*\?/i);
        expect(sql).not.toContain(data.name);
        expect(params).toEqual([data.name, data.description, JSON.stringify(data.config), 7, 42, 3]);
        expect(data).toEqual(before);
    });

    it('returns false when the conditional UPDATE matched no rows', async () => {
        const h = harness();
        h.execute.mockResolvedValue({ affectedRows: 0, insertId: 0 });
        await expect(h.repository.update(42, { ...pageData(), revision: 3 }, 7)).resolves.toBe(false);
    });

    it('does not use insertId to determine whether UPDATE succeeded', async () => {
        const h = harness(null);
        await expect(h.repository.update(42, { ...pageData(), revision: 3 }, 7)).resolves.toBe(true);
    });

    it('propagates execution failures', async () => {
        const h = harness();
        const error = new Error('Update unavailable');
        h.execute.mockRejectedValue(error);
        await expect(h.repository.update(42, { ...pageData(), revision: 3 }, 7)).rejects.toBe(error);
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
