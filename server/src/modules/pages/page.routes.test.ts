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
