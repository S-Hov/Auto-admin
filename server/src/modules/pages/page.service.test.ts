import { beforeEach, describe, expect, it, vi } from 'vitest';
import { admin, manager, database, repository } from '../../../tests/fixtures/access.fixture';
import { pageData, pageCatalog } from '../../../tests/fixtures/page.fixture';
import { schemaCatalogService, SchemaCatalogNotReadyError } from '../../core/schema-catalog';
import { PageService } from './page.service';

function harness() {
    const db = database();
    const access = repository();
    const createAccess = vi.fn(() => access);
    const repo = { create: vi.fn(async () => 42) };
    const createRepository = vi.fn(() => repo);
    const service = new PageService(db.provider, { type: 'mysql', createRepository: createAccess }, createRepository);
    return { ...db, access, createAccess, repo, createRepository, service };
}

beforeEach(() => vi.restoreAllMocks());

describe('PageService.create: catalog and transactional access checks', () => {
    it('validates the catalog before writing and uses the same transactional executor for both repositories', async () => {
        const load = vi.spyOn(schemaCatalogService, 'getAuthorizationCatalog').mockResolvedValue(pageCatalog());
        const h = harness();
        const data = pageData();
        await expect(h.service.create(data, admin, 'request-1')).resolves.toBe(42);
        expect(load).toHaveBeenCalledOnce();
        expect(h.transaction).toHaveBeenCalledOnce();
        expect(load.mock.invocationCallOrder[0]).toBeLessThan(h.transaction.mock.invocationCallOrder[0]);
        expect(h.createAccess).toHaveBeenCalledWith(h.executor);
        expect(h.createRepository).toHaveBeenCalledWith(h.executor);
        expect(h.access.isActiveSystemAdminForUpdate).toHaveBeenCalledWith(admin.userId);
        expect(h.repo.create).toHaveBeenCalledWith(data, admin.userId);
        expect(vi.mocked(h.access.isActiveSystemAdminForUpdate).mock.invocationCallOrder[0]).toBeLessThan(h.repo.create.mock.invocationCallOrder[0]);
    });

    it('rejects a non-admin before loading the catalog or starting a transaction', async () => {
        const load = vi.spyOn(schemaCatalogService, 'getAuthorizationCatalog').mockResolvedValue(pageCatalog());
        const h = harness();
        await expect(h.service.create(pageData(), manager)).rejects.toMatchObject({ status: 403 });
        expect(load).not.toHaveBeenCalled();
        expect(h.transaction).not.toHaveBeenCalled();
    });

    it('rejects an administrator revoked after authentication without creating the page', async () => {
        vi.spyOn(schemaCatalogService, 'getAuthorizationCatalog').mockResolvedValue(pageCatalog());
        const h = harness();
        vi.mocked(h.access.isActiveSystemAdminForUpdate).mockResolvedValue(false);
        await expect(h.service.create(pageData(), admin)).rejects.toMatchObject({ status: 403, code: 'ACCESS.ADMIN_REQUIRED' });
        expect(h.repo.create).not.toHaveBeenCalled();
    });

    it('rejects invalid catalog references before starting the write transaction', async () => {
        vi.spyOn(schemaCatalogService, 'getAuthorizationCatalog').mockResolvedValue(pageCatalog());
        const h = harness();
        const data = pageData();
        data.config.fields[0].fieldId = 999;
        await expect(h.service.create(data, admin)).rejects.toMatchObject({ status: 400 });
        expect(h.transaction).not.toHaveBeenCalled();
        expect(h.repo.create).not.toHaveBeenCalled();
    });

    it('preserves a catalog loading failure without attempting a write', async () => {
        const error = new SchemaCatalogNotReadyError();
        vi.spyOn(schemaCatalogService, 'getAuthorizationCatalog').mockRejectedValue(error);
        const h = harness();
        await expect(h.service.create(pageData(), admin)).rejects.toBe(error);
        expect(h.transaction).not.toHaveBeenCalled();
    });

    it('propagates database failures rather than returning a successful page ID', async () => {
        vi.spyOn(schemaCatalogService, 'getAuthorizationCatalog').mockResolvedValue(pageCatalog());
        const h = harness();
        const error = new Error('Insert failed');
        h.repo.create.mockRejectedValue(error);
        await expect(h.service.create(pageData(), admin)).rejects.toBe(error);
    });
});
