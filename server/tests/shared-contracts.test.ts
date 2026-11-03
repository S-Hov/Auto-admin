import { describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as common from '@auto-admin/contracts/common';
import * as auth from '@auto-admin/contracts/auth';
import * as install from '@auto-admin/contracts/install';
import * as menu from '@auto-admin/contracts/menu';
import * as pages from '@auto-admin/contracts/pages';
import * as access from '@auto-admin/contracts/access-control';
import * as query from '@auto-admin/contracts/query';
import { menuSaveSchema } from '../src/modules/menu/schema/menu.schema';
import { loginSchema } from '../src/modules/auth/schema/login.schema';
import { createPageSchema } from '../src/modules/pages/schema/page-create.schema';

describe('shared API contracts', () => {
    it('uses the same schema objects through legacy server paths', () => {
        expect(menuSaveSchema).toBe(menu.menuSaveSchema);
        expect(loginSchema).toBe(auth.loginSchema);
        expect(createPageSchema).toBe(pages.createPageSchema);
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
