import { describe, expect, it, vi } from 'vitest';
import type { DatabaseExecutor } from '../../../../db/contracts/executor.interface';
import type { MenuData } from '../../menu.types';
import { MySqlMenuRepository } from './mysql.repository';

function harness() {
    const queryRows = vi.fn<DatabaseExecutor['queryRows']>();
    const execute = vi.fn<DatabaseExecutor['execute']>(async () => ({ affectedRows: 1, insertId: 7 }));
    return { queryRows, execute, repository: new MySqlMenuRepository({ queryRows, execute }) };
}

const data: MenuData = {
    parentId: null, pageId: 42, name: 'Orders', slug: 'orders', icon: null,
    iconType: 'icon', sortOrder: 10, isActive: true,
};

describe('MySqlMenuRepository page binding', () => {
    it.each([true, false])('checks page existence with a transactional row lock: %s', async (exists) => {
        const h = harness();
        h.queryRows.mockResolvedValue(exists ? [{ id: 42 }] : []);
        await expect(h.repository.pageExistsForUpdate(42)).resolves.toBe(exists);
        expect(h.queryRows).toHaveBeenCalledWith(expect.stringMatching(/FROM Auto_Admin__pages WHERE id = \? FOR UPDATE/), [42]);
    });

    it.each([42, null])('inserts the requested page binding: %s', async (pageId) => {
        const h = harness();
        await expect(h.repository.save({ ...data, pageId }, 1)).resolves.toBe(7);
        const [sql, values] = h.execute.mock.calls[0];
        expect(sql).toContain('(parent_id, page_id, name, slug, icon, icon_type, sort_order, is_active, updated_by)');
        expect(values).toEqual([null, pageId, 'Orders', 'orders', null, 'icon', 10, true, 1]);
    });

    it.each([42, null])('updates or removes the page binding: %s', async (pageId) => {
        const h = harness();
        await expect(h.repository.save({ ...data, pageId }, 1, 7)).resolves.toBe(7);
        const [sql, values] = h.execute.mock.calls[0];
        expect(sql).toContain('page_id = ?');
        expect(values).toEqual([null, pageId, 'Orders', 'orders', null, 'icon', 10, true, 1, 7]);
    });

    it('reads pageId through both menu projections and preserves null values', async () => {
        const h = harness();
        h.queryRows.mockResolvedValue([{ ...data, id: 7 }, { ...data, id: 8, pageId: null }]);
        expect((await h.repository.readAll()).map(item => item.pageId)).toEqual([42, null]);
        expect((await h.repository.readForUser(1, 2)).map(item => item.pageId)).toEqual([42, null]);
        for (const [sql] of h.queryRows.mock.calls) expect(sql).toContain('m.page_id AS pageId');
    });
});
