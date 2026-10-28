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
        update: vi.fn<PageRepository['update']>(async () => true),
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

describe('PageService.update', () => {
    beforeEach(() => {
        vi.spyOn(schemaCatalogService, 'getAuthorizationCatalog').mockResolvedValue(pageCatalog());
    });

    it('updates with the expected revision and audits complete snapshots in the write transaction', async () => {
        const h = harness();
        const previous = { ...pageData(), pageId: 42, revision: 1 };
        const data = { ...pageData(), name: 'Новые заказы', description: 'Обновлено', revision: 1 };
        h.repo.get.mockResolvedValue(previous);
        const before = structuredClone(data);
        Object.freeze(data);
        await expect(h.service.update(42, data, admin, 'request-update')).resolves.toEqual({ pageId: 42, revision: 2 });
        expect(h.createAccess).toHaveBeenCalledWith(h.executor);
        expect(h.createRepository).toHaveBeenCalledWith(h.executor);
        expect(h.repo.update).toHaveBeenCalledWith(42, before, admin.userId);
        expect(h.repo.appendAudit).toHaveBeenCalledWith(
            42, 'update', admin.userId, previous,
            { ...before, pageId: 42, revision: 2 }, 'request-update',
        );
        expect(data).toEqual(before);
        expect(previous.revision).toBe(1);
        expect(h.repo.update.mock.invocationCallOrder[0]).toBeLessThan(h.repo.appendAudit.mock.invocationCallOrder[0]);
    });

    it('loads the catalog before opening a write transaction that already holds a connection', async () => {
        const h = harness();
        await h.service.update(42, { ...pageData(), revision: 1 }, admin);
        const load = vi.mocked(schemaCatalogService.getAuthorizationCatalog);
        expect(load.mock.invocationCallOrder[0]).toBeLessThan(h.transaction.mock.invocationCallOrder[0]);
    });

    it('rejects a non-admin before accessing the catalog or database', async () => {
        const h = harness();
        await expect(h.service.update(42, { ...pageData(), revision: 1 }, manager)).rejects.toMatchObject({ status: 403 });
        expect(schemaCatalogService.getAuthorizationCatalog).not.toHaveBeenCalled();
        expect(h.transaction).not.toHaveBeenCalled();
        expect(h.repo.update).not.toHaveBeenCalled();
    });

    it('awaits the current administrator check before reading or writing the page', async () => {
        const h = harness();
        vi.mocked(h.access.isActiveSystemAdminForUpdate).mockResolvedValue(false);
        await expect(h.service.update(42, { ...pageData(), revision: 1 }, admin)).rejects.toMatchObject({ status: 403 });
        expect(h.repo.get).not.toHaveBeenCalled();
        expect(h.repo.update).not.toHaveBeenCalled();
        expect(h.repo.appendAudit).not.toHaveBeenCalled();
    });

    it('reports a missing page without updating or auditing', async () => {
        const h = harness();
        h.repo.get.mockResolvedValue(null);
        await expect(h.service.update(42, { ...pageData(), revision: 1 }, admin)).rejects.toMatchObject({ status: 404 });
        expect(h.repo.update).not.toHaveBeenCalled();
        expect(h.repo.appendAudit).not.toHaveBeenCalled();
    });

    it('rejects a stale revision discovered when reading the page', async () => {
        const h = harness();
        h.repo.get.mockResolvedValue({ ...pageData(), pageId: 42, revision: 2 });
        await expect(h.service.update(42, { ...pageData(), revision: 1 }, admin)).rejects.toMatchObject({ status: 409 });
        expect(h.repo.update).not.toHaveBeenCalled();
        expect(h.repo.appendAudit).not.toHaveBeenCalled();
    });

    it('rejects a conflict discovered by the conditional UPDATE after the initial read', async () => {
        const h = harness();
        h.repo.update.mockResolvedValue(false);
        await expect(h.service.update(42, { ...pageData(), revision: 1 }, admin)).rejects.toMatchObject({ status: 409 });
        expect(h.repo.update).toHaveBeenCalledOnce();
        expect(h.repo.appendAudit).not.toHaveBeenCalled();
    });

    it('validates replacement config against the catalog before updating', async () => {
        const h = harness();
        const data = { ...pageData(), revision: 1 };
        data.config.fields[0].fieldId = 999;
        await expect(h.service.update(42, data, admin)).rejects.toMatchObject({ status: 400 });
        expect(h.repo.update).not.toHaveBeenCalled();
        expect(h.repo.appendAudit).not.toHaveBeenCalled();
    });

    it('preserves catalog failures without writing', async () => {
        const h = harness();
        const error = new SchemaCatalogNotReadyError();
        vi.mocked(schemaCatalogService.getAuthorizationCatalog).mockRejectedValue(error);
        await expect(h.service.update(42, { ...pageData(), revision: 1 }, admin)).rejects.toBe(error);
        expect(h.repo.update).not.toHaveBeenCalled();
    });

    it('does not audit a failed UPDATE', async () => {
        const h = harness();
        const error = new Error('Update failed');
        h.repo.update.mockRejectedValue(error);
        await expect(h.service.update(42, { ...pageData(), revision: 1 }, admin)).rejects.toBe(error);
        expect(h.repo.appendAudit).not.toHaveBeenCalled();
    });

    it('keeps the transaction pending until update audit is complete', async () => {
        const h = harness();
        let finishAudit!: () => void;
        h.repo.appendAudit.mockReturnValue(new Promise<void>(resolve => { finishAudit = resolve; }));
        let finished = false;
        const update = h.service.update(42, { ...pageData(), revision: 1 }, admin).then(result => {
            finished = true;
            return result;
        });
        try {
            await vi.waitFor(() => expect(h.repo.appendAudit).toHaveBeenCalledOnce());
            expect(finished).toBe(false);
        } finally {
            finishAudit();
            await update;
        }
    });

    it('propagates an audit failure through the transaction callback', async () => {
        const h = harness();
        const error = new Error('Update audit failed');
        h.repo.appendAudit.mockRejectedValue(error);
        await expect(h.service.update(42, { ...pageData(), revision: 1 }, admin)).rejects.toBe(error);
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
