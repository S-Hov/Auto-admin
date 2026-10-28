import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { admin, manager } from '../../../tests/fixtures/access.fixture';
import { pageData } from '../../../tests/fixtures/page.fixture';

const { readAuthSession } = vi.hoisted(() => ({ readAuthSession: vi.fn() }));
vi.mock('../auth', () => ({ readAuthSession }));
vi.mock('../../shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
import pageRouter from './page.routes';
import { pageService } from './page.service';
import { errorHandler } from '../../shared/middleware/errorHandler';
import { httpLogger } from '../../shared/middleware/logger';
import { COOKIE_NAMES } from '../../constants/cookies';
import { conflict, notFound } from '../../shared/api/errors/error-helpers';

let server: Server;
let url: string;
const cookie = `${COOKIE_NAMES.AUTH_SESSION}=${'a'.repeat(64)}`;
const session = { ...admin, username: 'admin', expiresAt: new Date(Date.now() + 60_000) };

beforeAll(async () => {
    const app = express();
    app.use(httpLogger, express.json(), cookieParser());
    app.use('/api/pages', pageRouter);
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test address');
    url = `http://127.0.0.1:${address.port}/api/pages`;
});

beforeEach(() => {
    vi.restoreAllMocks();
    readAuthSession.mockReset().mockResolvedValue(session);
    vi.spyOn(pageService, 'create').mockResolvedValue({ pageId: 42, revision: 1 });
    vi.spyOn(pageService, 'get').mockResolvedValue({ ...pageData(), pageId: 42, revision: 1 });
    vi.spyOn(pageService, 'update').mockResolvedValue({ pageId: 42, revision: 4 });
    vi.spyOn(pageService, 'delete').mockResolvedValue({ deleted: true });
});

describe('page deletion HTTP boundary', () => {
    function remove(id = '42', authenticated = true) {
        return fetch(`${url}/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { 'x-request-id': 'page-delete-request', ...(authenticated ? { Cookie: cookie } : {}) },
        });
    }

    it('requires a session', async () => {
        expect((await remove('42', false)).status).toBe(401);
        expect(pageService.delete).not.toHaveBeenCalled();
    });

    it('requires a system administrator', async () => {
        readAuthSession.mockResolvedValue({ ...session, ...manager });
        expect((await remove()).status).toBe(403);
        expect(pageService.delete).not.toHaveBeenCalled();
    });

    it.each(['0', '-1', '1.5', '1e2', '0x10', '01', 'abc', '9007199254740992'])('rejects invalid ID %s before the service', async (id) => {
        expect((await remove(id)).status).toBe(400);
        expect(pageService.delete).not.toHaveBeenCalled();
    });

    it('passes ID, principal and request ID and returns the deletion result', async () => {
        const response = await remove();
        expect(response.status).toBe(200);
        expect(pageService.delete).toHaveBeenCalledWith(42, session, 'page-delete-request');
        expect(await response.json()).toMatchObject({ data: { deleted: true } });
    });

    it('returns 404 for a missing page', async () => {
        vi.mocked(pageService.delete).mockRejectedValue(notFound());
        expect((await remove()).status).toBe(404);
    });

    it('returns 409 for a page referenced by menu', async () => {
        vi.mocked(pageService.delete).mockRejectedValue(conflict());
        expect((await remove()).status).toBe(409);
    });

    it('does not return success on a transaction failure', async () => {
        vi.mocked(pageService.delete).mockRejectedValue(new Error('Audit failed'));
        expect((await remove()).status).toBe(500);
    });
});

describe('page update HTTP boundary', () => {
    function update(body: unknown = { ...pageData(), revision: 3 }, id = '42', authenticated = true) {
        return fetch(`${url}/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json', 'x-request-id': 'page-update-request',
                ...(authenticated ? { Cookie: cookie } : {}),
            },
            body: JSON.stringify(body),
        });
    }

    it('passes the numeric URL ID, validated body, principal and request ID', async () => {
        const data = { ...pageData(), revision: 3 };
        const response = await update({ ...data, name: ' Заказы ' });
        expect(response.status).toBe(200);
        expect(pageService.update).toHaveBeenCalledWith(42, data, session, 'page-update-request');
        expect(await response.json()).toMatchObject({ data: { pageId: 42, revision: 4 } });
    });

    it('requires a session', async () => {
        expect((await update(undefined, '42', false)).status).toBe(401);
        expect(pageService.update).not.toHaveBeenCalled();
    });

    it('requires a system administrator', async () => {
        readAuthSession.mockResolvedValue({ ...session, ...manager });
        expect((await update()).status).toBe(403);
        expect(pageService.update).not.toHaveBeenCalled();
    });

    it('validates both URL params and the body before invoking the service', async () => {
        expect((await update({ ...pageData(), revision: 3 }, '1e2')).status).toBe(400);
        expect((await update(pageData())).status).toBe(400);
        expect(pageService.update).not.toHaveBeenCalled();
    });

    it('preserves a revision conflict from the service', async () => {
        vi.mocked(pageService.update).mockRejectedValue(conflict());
        expect((await update()).status).toBe(409);
    });

    it('preserves a missing-page response from the service', async () => {
        vi.mocked(pageService.update).mockRejectedValue(notFound());
        expect((await update()).status).toBe(404);
    });
});

describe('page reading HTTP boundary', () => {
    function read(id = '42', authenticated = true) {
        return fetch(`${url}/${encodeURIComponent(id)}`, {
            headers: authenticated ? { Cookie: cookie } : {},
        });
    }

    it('requires a session before reading', async () => {
        expect((await read('42', false)).status).toBe(401);
        expect(pageService.get).not.toHaveBeenCalled();
    });

    it('rejects non-admins before reading', async () => {
        readAuthSession.mockResolvedValue({ ...session, ...manager });
        expect((await read()).status).toBe(403);
        expect(pageService.get).not.toHaveBeenCalled();
    });

    it.each(['0', '-1', '1.5', '1e2', '0x10', '01', '9007199254740992'])('rejects invalid ID %s before the service', async (id) => {
        expect((await read(id)).status).toBe(400);
        expect(pageService.get).not.toHaveBeenCalled();
    });

    it('passes a numeric ID and the session principal and returns the page', async () => {
        const response = await read();
        expect(response.status).toBe(200);
        expect(pageService.get).toHaveBeenCalledWith(42, session);
        expect(await response.json()).toMatchObject({ data: { ...pageData(), pageId: 42, revision: 1 } });
    });

    it('preserves a not-found service response', async () => {
        vi.mocked(pageService.get).mockRejectedValue(notFound());
        expect((await read()).status).toBe(404);
    });
});

afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

function request(body: unknown = pageData(), authenticated = true) {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', 'x-request-id': 'page-test-request',
            ...(authenticated ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
    });
}

describe('page creation HTTP boundary', () => {
    it('requires a session', async () => {
        expect((await request(pageData(), false)).status).toBe(401);
        expect(pageService.create).not.toHaveBeenCalled();
    });

    it('rejects a non-admin before executing the service', async () => {
        readAuthSession.mockResolvedValue({ ...session, ...manager });
        expect((await request()).status).toBe(403);
        expect(pageService.create).not.toHaveBeenCalled();
    });

    it.each([{}, { ...pageData(), revision: 5 }, { ...pageData(), name: ' ' }])('rejects invalid input: %j', async (body) => {
        expect((await request(body)).status).toBe(400);
        expect(pageService.create).not.toHaveBeenCalled();
    });

    it('passes normalized input, the authenticated principal and request ID to the service', async () => {
        const data = pageData();
        const response = await request({ ...data, name: ' Заказы ' });
        expect(response.status).toBe(200);
        expect(response.headers.get('x-request-id')).toBe('page-test-request');
        expect(pageService.create).toHaveBeenCalledWith(data, session, 'page-test-request');
        expect(await response.json()).toMatchObject({ data: { pageId: 42, revision: 1 } });
    });

    it('does not return success when the service fails', async () => {
        vi.mocked(pageService.create).mockRejectedValue(new Error('Insert failed'));
        expect((await request()).status).toBe(500);
    });
});
