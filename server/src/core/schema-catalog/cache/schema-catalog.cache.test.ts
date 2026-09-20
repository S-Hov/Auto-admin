import { describe, expect, it, vi } from "vitest";
import type { SchemaCatalog } from "../types/schema-catalog.types";
import { SchemaCatalogCache } from "./schema-catalog.cache";

const createCatalog = (fingerprint = 'fingerprint'): SchemaCatalog => ({
    schemaName: 'shop',
    fingerprint,
    loadedAt: Date.now(),
    resources: [{
        id: 1,
        schemaName: 'shop',
        tableName: 'orders',
        type: 'table',
        engine: 'InnoDB',
        comment: null,
        isServiceTable: false,
        state: 'present',
        firstSeenScanId: 1,
        lastSeenScanId: 1,
    }],
    fields: [],
    constraints: [],
    indexes: [],
});

describe('SchemaCatalogCache', () => {
    it('coalesces concurrent lazy loads', async () => {
        const cache = new SchemaCatalogCache();
        const loader = vi.fn(async () => createCatalog());

        const [first, second] = await Promise.all([
            cache.getOrLoad(loader),
            cache.getOrLoad(loader),
        ]);

        expect(loader).toHaveBeenCalledTimes(1);
        expect(first).toBe(second);
        expect(cache.getResourceByName('orders')?.id).toBe(1);
    });

    it('atomically replaces and freezes the catalog', () => {
        const cache = new SchemaCatalogCache();
        const first = cache.replace(createCatalog('first'));
        const second = cache.replace(createCatalog('second'));

        expect(first.fingerprint).toBe('first');
        expect(cache.get()).toBe(second);
        expect(Object.isFrozen(second)).toBe(true);
        expect(Object.isFrozen(second.resources)).toBe(true);
    });

    it('can be cleared', () => {
        const cache = new SchemaCatalogCache();
        cache.replace(createCatalog());
        cache.clear();

        expect(cache.get()).toBeNull();
        expect(cache.getResourceById(1)).toBeNull();
    });

    it('does not overwrite a newer catalog when a lazy load finishes late', async () => {
        const cache = new SchemaCatalogCache();
        let finishLoad: ((catalog: SchemaCatalog) => void) | undefined;
        const slowLoad = new Promise<SchemaCatalog>((resolve) => {
            finishLoad = resolve;
        });
        const loading = cache.getOrLoad(() => slowLoad);

        cache.replace(createCatalog('new'));
        finishLoad?.(createCatalog('old'));

        await loading;
        expect(cache.get()?.fingerprint).toBe('new');
    });
});
