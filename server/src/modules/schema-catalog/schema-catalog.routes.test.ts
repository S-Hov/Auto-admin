import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { admin, manager, catalog } from '../../../tests/fixtures/access.fixture';
const { readAuthSession } = vi.hoisted(() => ({ readAuthSession: vi.fn() }));
vi.mock('../auth', () => ({ readAuthSession }));
vi.mock('../../shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
import router from './schema-catalog.routes';
import { schemaCatalogService, SchemaCatalogNotReadyError } from '../../core/schema-catalog';
import { errorHandler } from '../../shared/middleware/errorHandler';
import { COOKIE_NAMES } from '../../constants/cookies';
import { catalogResponseSchema } from '@auto-admin/contracts/schema-catalog';

let server: Server;
let url: string;
const headers = { Cookie: `${COOKIE_NAMES.AUTH_SESSION}=${'a'.repeat(64)}` };
beforeAll(async () => {
    const app = express();
    app.use(cookieParser());
    app.use('/catalog', router);
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test address');
    url = `http://127.0.0.1:${address.port}/catalog`;
});
beforeEach(() => {
    vi.restoreAllMocks();
    readAuthSession.mockReset().mockResolvedValue({ ...admin, username: 'admin', expiresAt: new Date(Date.now() + 60000) });
    vi.spyOn(schemaCatalogService, 'getCatalog').mockResolvedValue(catalog());
});
afterAll(async () => { server.close(); await once(server, 'close'); });
it('returns metadata from the stored catalog, including system table markers', async () => {
    const response = await fetch(url, { headers });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = catalogResponseSchema.parse(await response.json());
    expect(body.data.resources.some(resource => resource.isSystem)).toBe(true);
    expect(schemaCatalogService.getCatalog).toHaveBeenCalledOnce();
});
it('does not expose database structure to anonymous users or non-admins', async () => {
    expect((await fetch(url)).status).toBe(401);
    readAuthSession.mockResolvedValue({ ...manager, username: 'manager', expiresAt: new Date(Date.now() + 60000) });
    expect((await fetch(url, { headers })).status).toBe(403);
    expect(schemaCatalogService.getCatalog).not.toHaveBeenCalled();
});
it('returns an actionable 409 instead of 500 when the schema has never been scanned', async () => {
    vi.mocked(schemaCatalogService.getCatalog).mockRejectedValue(new SchemaCatalogNotReadyError());
    const scan = vi.spyOn(schemaCatalogService, 'scan');
    const response = await fetch(url, { headers });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, code: 'SCHEMA.CATALOG_REQUIRED' });
    expect(scan).not.toHaveBeenCalled();
});
