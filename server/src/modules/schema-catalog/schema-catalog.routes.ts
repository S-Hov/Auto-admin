import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../shared/middleware/auth.middleware';
import { createRateLimiter } from '../../shared/middleware/rateLimiter';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../shared/api/success';
import { schemaCatalogService, SchemaCatalogNotReadyError } from '../../core/schema-catalog';
import { conflict } from '../../shared/api/errors/error-helpers';
import { ERROR_CODES } from '@auto-admin/contracts/common';
import { presentCatalog } from './catalog-presenter';

const router = Router();
// Includes system metadata, so this endpoint is deliberately admin-only.
router.use(requireAuth, requireAdmin, createRateLimiter({ limit: 60, windowMs: 60_000 }));
router.get('/', asyncHandler(async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
        return ok(res, undefined, presentCatalog(await schemaCatalogService.getCatalog()));
    } catch (error) {
        if (error instanceof SchemaCatalogNotReadyError) throw conflict(ERROR_CODES.SCHEMA_CATALOG_REQUIRED);
        throw error;
    }
}));
export default router;
