import { Router } from "express";
import { requireAdmin, requireAuth } from "../../shared/middleware/auth.middleware";
import { createRateLimiter } from "../../shared/middleware/rateLimiter";
import { validate } from "../../shared/middleware/validate";
import { createPageSchema } from "./schema/page-create.schema";
import { createPageController, deletePageController, getPageController, getPageRowsController, listPagesController, updatePageController } from "./page.controller";
import { getPageSchema } from "./schema/page-get.schema";
import { updatePageSchema } from "./schema/page-update.schema";
import { pageListSchema } from "./schema/page-list.schema";
import { pageRowsHttpQuerySchema } from './schema/page-rows-http-query.schema';

const pageRouter = Router();
pageRouter.use(requireAuth, requireAdmin, createRateLimiter({ limit: 120, windowMs: 60_000 }));
pageRouter.post("/", validate(createPageSchema), createPageController);
pageRouter.get("/", validate(pageListSchema, "query"), listPagesController);
pageRouter.get('/:id/rows', validate(getPageSchema, 'params'), validate(pageRowsHttpQuerySchema, 'query'), getPageRowsController);
pageRouter.get("/:id", validate(getPageSchema, "params"), getPageController);
pageRouter.put("/:id", validate(getPageSchema, "params"), validate(updatePageSchema), updatePageController);
pageRouter.delete("/:id", validate(getPageSchema, "params"), deletePageController);

export default pageRouter;
