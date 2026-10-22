import { describe, expect, it, vi } from 'vitest';
import type { DatabaseExecutor } from '../../../db/contracts/executor.interface';
import { MySqlMigrationProvider } from './mysql-migration.provider';
import { verifyMigrationApplied } from './migration.verification';

const specs = [
    {
        version: '0024', table: 'Auto_Admin__pages',
        columns: ['id', 'name', 'description', 'config', 'revision', 'created_at', 'updated_at', 'created_by', 'updated_by'],
        indexes: ['idx_pages_created_by', 'idx_pages_updated_by'],
        constraints: ['chk_pages_revision', 'chk_pages_config_object', 'fk_pages_created_by', 'fk_pages_updated_by'],
    },
    {
        version: '0025', table: 'Auto_Admin__menu',
        columns: ['page_id'], indexes: ['idx_menu_page'], constraints: ['fk_menu_page'],
    },
    {
        version: '0026', table: 'Auto_Admin__page_audit_events',
        columns: ['id', 'page_id', 'action', 'actor_user_id', 'previous_value', 'new_value', 'request_id', 'created_at'],
        indexes: ['idx_page_audit_item_created'], constraints: ['fk_page_audit_actor'],
    },
];

describe('page migrations', () => {
    it('loads pages before the menu foreign key and audit table', async () => {
        const catalog = await new MySqlMigrationProvider().loadCatalog();
        const migrations = catalog.filter((entry) => ['0024', '0025', '0026'].includes(entry.version));
        expect(migrations.map((entry) => entry.version)).toEqual(['0024', '0025', '0026']);
        expect(migrations[0].sql).toContain('CREATE TABLE IF NOT EXISTS Auto_Admin__pages');
        expect(migrations[0].sql).toContain("JSON_TYPE(config) = 'OBJECT'");
        expect(migrations[0].sql).toContain('CHECK (revision >= 1)');
        expect(migrations[1].sql).toContain('REFERENCES Auto_Admin__pages(id) ON DELETE RESTRICT');
        // Аудит должен пережить удаление страницы: намеренно нет FK page_id -> pages.
        expect(migrations[2].sql).not.toContain('REFERENCES Auto_Admin__pages');
    });

    describe.each(specs)('verification $version', (spec) => {
        function executor(missing?: 'columns' | 'indexes' | 'constraints') {
            const rows = (names: readonly string[]) => names.map((name) => ({ name }));
            const queryRows = vi.fn()
                .mockResolvedValueOnce(rows(missing === 'columns' ? spec.columns.slice(1) : spec.columns))
                .mockResolvedValueOnce(rows(missing === 'indexes' ? [] : spec.indexes))
                .mockResolvedValueOnce(rows(missing === 'constraints' ? [] : spec.constraints));
            return { queryRows, db: { queryRows } as unknown as DatabaseExecutor };
        }

        it('confirms the complete structure', async () => {
            const { db, queryRows } = executor();
            await expect(verifyMigrationApplied(db, spec.version)).resolves.toBe(true);
            for (const call of queryRows.mock.calls) expect(call[1]).toEqual([spec.table]);
        });
        it.each(['columns', 'indexes', 'constraints'] as const)('rejects missing %s during recovery', async (missing) => {
            await expect(verifyMigrationApplied(executor(missing).db, spec.version)).resolves.toBe(false);
        });
    });
});
