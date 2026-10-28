import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { admin, manager } from '../../../tests/fixtures/access.fixture';

const { readAuthSession } = vi.hoisted(() => ({ readAuthSession: vi.fn() }));
vi.mock('../auth', () => ({ readAuthSession }));
import menuRouter from './menu.routes';
import { menuService } from './menu.service';
import { errorHandler } from '../../shared/middleware/errorHandler';
import { COOKIE_NAMES } from '../../constants/cookies';

let server: Server;
let url: string;
const cookie = `${COOKIE_NAMES.AUTH_SESSION}=${'a'.repeat(64)}`;
const session = { ...admin, username: 'admin', expiresAt: new Date(Date.now() + 60_000) };
const validItem = {
    id: 1, parentId: null, name: 'Orders', slug: 'orders', icon: null,
    iconType: 'icon', sortOrder: 10, isActive: true,
};
const permission = {
    menuId: 1, subjectType: 'role', subjectId: 2,
    permissions: { canView: true, canCreate: false, canUpdate: false, canDelete: false },
};

beforeAll(async () => {
    const app = express();
    app.use(express.json(), cookieParser());
    app.use('/menu', menuRouter);
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test address');
    url = `http://127.0.0.1:${address.port}/menu`;
});
beforeEach(() => {
    vi.restoreAllMocks();
    readAuthSession.mockReset().mockResolvedValue(session);
    vi.spyOn(menuService, 'getMenu').mockResolvedValue([]);
    vi.spyOn(menuService, 'getManageableMenu').mockResolvedValue([]);
    vi.spyOn(menuService, 'save').mockResolvedValue({ id: 1 });
    vi.spyOn(menuService, 'delete').mockResolvedValue({ deleted: true });
    vi.spyOn(menuService, 'changePermissions').mockResolvedValue({ changed: true });
});
afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
function request(method: string, path = '', body?: unknown, authenticated = true) {
    return fetch(url + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(authenticated ? { Cookie: cookie } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

describe('menu HTTP validation and access boundaries', () => {
    it.each([42, null])('accepts a page binding or explicit unlink: %s', async (pageId) => {
        expect((await request('POST', '', { ...validItem, pageId })).status).toBe(200);
        expect(menuService.save).toHaveBeenCalledWith({ ...validItem, pageId }, session, null);
    });

    it.each([0, -1, 1.5, '42', true, Number.MAX_SAFE_INTEGER + 1])('rejects invalid pageId %s before invoking the service', async (pageId) => {
        expect((await request('POST', '', { ...validItem, pageId })).status).toBe(400);
        expect(menuService.save).not.toHaveBeenCalled();
    });
    it.each([['GET', ''], ['GET', '/manage'], ['POST', ''], ['DELETE', '/1'], ['PUT', '/permissions']])('%s %s requires a session before invoking a service', async (method, path) => {
        expect((await request(method, path, undefined, false)).status).toBe(401);
        expect(readAuthSession).not.toHaveBeenCalled();
        expect(menuService.getMenu).not.toHaveBeenCalled();
        expect(menuService.getManageableMenu).not.toHaveBeenCalled();
        expect(menuService.save).not.toHaveBeenCalled();
        expect(menuService.delete).not.toHaveBeenCalled();
        expect(menuService.changePermissions).not.toHaveBeenCalled();
    });
    it('allows a manager to read their navigation', async () => {
        readAuthSession.mockResolvedValue({ ...session, ...manager });
        expect((await request('GET')).status).toBe(200);
        expect(menuService.getMenu).toHaveBeenCalledWith(expect.objectContaining({ userId: manager.userId }));
    });
    it.each([['GET', '/manage'], ['POST', ''], ['DELETE', '/1'], ['PUT', '/permissions']])('blocks non-admin %s %s before validation and service calls', async (method, path) => {
        readAuthSession.mockResolvedValue({ ...session, ...manager });
        const response = await request(method, path, method === 'GET' || method === 'DELETE' ? undefined : {});
        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({ code: 'ACCESS.ADMIN_REQUIRED' });
        expect(menuService.getManageableMenu).not.toHaveBeenCalled();
        expect(menuService.save).not.toHaveBeenCalled();
        expect(menuService.delete).not.toHaveBeenCalled();
        expect(menuService.changePermissions).not.toHaveBeenCalled();
    });
    it.each([
        {},
        { ...validItem, name: '' },
        { ...validItem, parentId: '1' },
        { ...validItem, id: 0 },
        { ...validItem, isActive: 'true' },
        { ...validItem, canManageEverything: true },
        { ...validItem, iconType: 'svg', icon: '<svg onload="alert(1)"/>' },
        { ...validItem, iconType: 'image', icon: 'javascript:alert(1)' },
        { ...validItem, iconType: 'image', icon: '/assets/../secret.svg' },
    ])('rejects an invalid save body before entering the service: %j', async (body) => {
        const response = await request('POST', '', body);
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ code: 'COMMON.VALIDATION_FAILED', details: expect.any(Array) });
        expect(menuService.save).not.toHaveBeenCalled();
    });
    it('passes normalized data and the session principal to save', async () => {
        expect((await request('POST', '', { ...validItem, name: ' Orders ' })).status).toBe(200);
        expect(menuService.save).toHaveBeenCalledWith(validItem, session, null);
    });
    it.each(['0', '-1', '1.5', '1e2', '0x10', '01', 'abc', '9007199254740992'])('rejects a noncanonical/unsafe delete ID %s', async (id) => {
        const response = await request('DELETE', `/${id}`);
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ code: 'COMMON.VALIDATION_FAILED' });
        expect(menuService.delete).not.toHaveBeenCalled();
    });
    it('passes a validated numeric ID to delete', async () => {
        expect((await request('DELETE', '/42')).status).toBe(200);
        expect(menuService.delete).toHaveBeenCalledWith(42, session, null);
    });
    it.each([
        {},
        { ...permission, subjectType: 'anything' },
        { ...permission, permissions: { ...permission.permissions, canView: 'yes' } },
        { ...permission, subjectId: -1 },
        { ...permission, unexpected: true },
    ])('rejects invalid permission bodies: %j', async (body) => {
        expect((await request('PUT', '/permissions', body)).status).toBe(400);
        expect(menuService.changePermissions).not.toHaveBeenCalled();
    });
    it('accepts valid explicit rules and null for removing an override', async () => {
        expect((await request('PUT', '/permissions', permission)).status).toBe(200);
        expect(menuService.changePermissions).toHaveBeenLastCalledWith(permission, session, null);
        const removal = { ...permission, permissions: null };
        expect((await request('PUT', '/permissions', removal)).status).toBe(200);
        expect(menuService.changePermissions).toHaveBeenLastCalledWith(removal, session, null);
    });
});
