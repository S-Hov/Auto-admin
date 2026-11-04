import { describe, expect, it } from 'vitest';
import { access as fileAccess, readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as common from '@auto-admin/contracts/common';
import * as install from '@auto-admin/contracts/install';
import * as pages from '@auto-admin/contracts/pages';
import * as access from '@auto-admin/contracts/access-control';
import * as query from '@auto-admin/contracts/query';

describe('shared API contracts', () => {
    it('accepts typed queries for every supported action', () => {
        const requests: query.UnifiedQuery[] = [
            {
                action: 'read', table: 'orders', select: ['orders.id'],
                joins: [{ table: 'items', type: 'LEFT', on: { 'orders.id': 'items.order_id' } }],
                where: { _and: [{ paid: { _eq: true } }, { total: { _gt: 0 } }] },
            },
            { action: 'create', table: 'orders', data: [{ total: 42 }, { total: 10 }] },
            { action: 'update', table: 'orders', data: { note: null }, where: { id: { _eq: 1 } } },
            { action: 'delete', table: 'orders', where: { id: { _in: [1, 2] } } },
        ];
        for (const request of requests) {
            expect(query.queryEngineSchema.parse(request)).toEqual(request);
        }
    });
    it.each([
        { action: 'read', table: 'orders' },
        { action: 'read', table: 'orders', select: ['id'], connection: 'main' },
        { action: 'read', table: 'orders', select: ['id'], joins: [{ table: 'items', type: 'OUTER', on: { id: 'order_id' } }] },
        { action: 'create', table: 'orders', data: { id: 1 }, returning: ['id'] },
        { action: 'update', table: 'orders', data: { id: 1 }, where: { id: { _eq: 1 } }, connection: 'main' },
        { action: 'delete', table: 'orders', where: { id: { _eq: 1 } }, returning: ['id'] },
        { action: 'aggregate', table: 'orders' },
        { action: 'create', table: 'orders', data: { nested: { id: 1 } } },
    ])('rejects unsupported query shapes: %j', (request) => {
        expect(query.queryEngineSchema.safeParse(request).success).toBe(false);
    });
    it('does not retain legacy schema bridges in the applications', async () => {
        for (const path of [
            '../src/modules/menu/schema/menu.schema.ts',
            '../src/modules/pages/schema/page-create.schema.ts',
            '../src/modules/auth/schema/login.schema.ts',
            '../../client/src/shared/api/menu/menu.schema.ts',
            '../../client/src/shared/api/auth/auth.schema.ts',
        ]) {
            await expect(fileAccess(new URL(path, import.meta.url))).rejects.toMatchObject({ code: 'ENOENT' });
        }
    });
    it('keeps request and response contracts for similarly named operations separate', () => {
        expect(install.applyNextMigrationRequestSchema.safeParse({ expectedVersion: '0001' }).success).toBe(true);
        expect(install.applyNextMigrationSchema.safeParse({ applied: null, nextVersion: null, isComplete: true }).success).toBe(true);
        expect(pages.pageListQuerySchema.parse({})).toEqual({ q: '', limit: 25, offset: 0 });
        expect(common.ERROR_CODES.PAGE_FIELD_UNAVAILABLE).toBe('PAGE.FIELD_UNAVAILABLE');
        expect(access.permissionChangeSchema.safeParse({}).success).toBe(false);
        expect(query.executeRequestSchema.safeParse({ version: 1, query: {} }).success).toBe(true);
    });
    it('supports the server CommonJS runtime for every public entry point', () => {
        const require = createRequire(import.meta.url);
        for (const name of ['common', 'pages', 'auth', 'install', 'bootstrap', 'database', 'menu', 'access-control', 'query']) {
            expect(Object.keys(require(`@auto-admin/contracts/${name}`)).length).toBeGreaterThan(0);
        }
    });
    it('has no runtime dependencies on applications, Node-only APIs, React or Express', async () => {
        const root = new URL('../../packages/contracts/', import.meta.url);
        const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
        expect(Object.keys(manifest.dependencies)).toEqual(['zod']);
        async function check(directory: string): Promise<void> {
            for (const entry of await readdir(directory, { withFileTypes: true })) {
                const path = join(directory, entry.name);
                if (entry.isDirectory()) await check(path);
                else if (entry.name.endsWith('.ts')) {
                    const text = await readFile(path, 'utf8');
                    expect(text).not.toMatch(/from\s+["'](?:node:|express|react|.*\/(?:server|client)\/)/);
                }
            }
        }
        await check(fileURLToPath(new URL('src', root)));
    });
});
