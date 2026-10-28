import { beforeEach, describe, expect, it, vi } from 'vitest';
import { admin, manager, database, repository } from '../../../tests/fixtures/access.fixture';
import { pageData, pageCatalog } from '../../../tests/fixtures/page.fixture';
import { schemaCatalogService, SchemaCatalogNotReadyError } from '../../core/schema-catalog';
import { PageService } from './page.service';
import type { PageRepository } from './repository/repository.interface';

function harness() {
    const db = database();
    const access = repository();
    const createAccess = vi.fn(() => access);
    const repo = {
        create: vi.fn<PageRepository['create']>(async () => 42),
        appendAudit: vi.fn<PageRepository['appendAudit']>(async () => {}),
        get: vi.fn<PageRepository['get']>(async () => ({ ...pageData(), pageId: 42, revision: 1 })),
    };
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
        await expect(h.service.create(data, admin, 'request-1')).resolves.toEqual({ pageId: 42, revision: 1 });
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
        expect(h.repo.appendAudit).not.toHaveBeenCalled();
    });
});

describe('PageService.get', () => {
    it('reads an existing page using the ordinary provider as executor', async () => {
        const h = harness();
        await expect(h.service.get(42, admin)).resolves.toEqual({ ...pageData(), pageId: 42, revision: 1 });
        expect(h.createRepository).toHaveBeenCalledWith(h.provider);
        expect(h.repo.get).toHaveBeenCalledWith(42);
        expect(h.transaction).not.toHaveBeenCalled();
        expect(h.repo.create).not.toHaveBeenCalled();
        expect(h.repo.appendAudit).not.toHaveBeenCalled();
    });

    it('rejects a non-admin before reading a page', async () => {
        const h = harness();
        await expect(h.service.get(42, manager)).rejects.toMatchObject({ status: 403 });
        expect(h.createRepository).not.toHaveBeenCalled();
        expect(h.repo.get).not.toHaveBeenCalled();
    });

    it('returns a not-found error when the repository returns null', async () => {
        const h = harness();
        h.repo.get.mockResolvedValue(null);
        await expect(h.service.get(42, admin)).rejects.toMatchObject({ status: 404 });
    });

    it('preserves database errors instead of reporting them as a missing page', async () => {
        const h = harness();
        const error = new Error('Read failed');
        h.repo.get.mockRejectedValue(error);
        await expect(h.service.get(42, admin)).rejects.toBe(error);
    });
});

describe('PageService.create: audit transaction boundary', () => {
    beforeEach(() => {
        vi.spyOn(schemaCatalogService, 'getAuthorizationCatalog').mockResolvedValue(pageCatalog());
    });

    it('audits the complete created page, including metadata and the initial revision', async () => {
        const h = harness();
        const data = { ...pageData(), description: 'Список заказов' };
        await h.service.create(data, admin, 'request-1');
        expect(h.repo.appendAudit).toHaveBeenCalledOnce();
        expect(h.repo.appendAudit).toHaveBeenCalledWith(
            42, 'create', admin.userId, null,
            { ...data, pageId: 42, revision: 1 },
            'request-1',
        );
        expect(h.repo.create.mock.invocationCallOrder[0]).toBeLessThan(h.repo.appendAudit.mock.invocationCallOrder[0]);
    });

    it('passes null to audit when there is no request ID', async () => {
        const h = harness();
        await h.service.create(pageData(), admin);
        expect(h.repo.appendAudit.mock.calls[0][5]).toBeNull();
    });

    it('keeps the transaction callback pending until audit has finished', async () => {
        const h = harness();
        let finishAudit!: () => void;
        const audit = new Promise<void>(resolve => { finishAudit = resolve; });
        h.repo.appendAudit.mockReturnValue(audit);
        let finished = false;
        const creation = h.service.create(pageData(), admin).then(result => {
            finished = true;
            return result;
        });
        try {
            await vi.waitFor(() => expect(h.repo.appendAudit).toHaveBeenCalledOnce());
            expect(finished).toBe(false);
        } finally {
            finishAudit();
            await creation;
        }
    });

    it('rejects the transaction callback on audit failure so the provider can roll back creation', async () => {
        const h = harness();
        const error = new Error('Audit insert failed');
        const audit = Promise.reject(error);
        // Prevent an unhandled rejection from the deliberately broken implementation.
        // The service must still propagate this failure through its transaction callback.
        void audit.catch(() => {});
        h.repo.appendAudit.mockReturnValue(audit);
        await expect(h.service.create(pageData(), admin)).rejects.toBe(error);
    });
});
