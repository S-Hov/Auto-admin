import { Router } from "express";
import { requireAdmin, requireAuth } from "../../shared/middleware/auth.middleware";
import { createRateLimiter } from "../../shared/middleware/rateLimiter";
import { validate } from "../../shared/middleware/validate";
import { createPageSchema } from "./schema/page-create.schema";
import { createPageController, getPageController, updatePageController } from "./page.controller";
import { getPageSchema } from "./schema/page-get.schema";
import { updatePageSchema } from "./schema/page-update.schema";

const pageRouter = Router();
pageRouter.use(requireAuth, requireAdmin, createRateLimiter({ limit: 120, windowMs: 60_000 }));
pageRouter.post("/", validate(createPageSchema), createPageController);
pageRouter.get("/:id", validate(getPageSchema, "params"), getPageController);
pageRouter.put("/:id", validate(getPageSchema, "params"), validate(updatePageSchema), updatePageController);

export default pageRouter;