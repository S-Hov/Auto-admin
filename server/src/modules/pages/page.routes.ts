import { Router } from "express";
import { requireAdmin, requireAuth } from "../../shared/middleware/auth.middleware";
import { createRateLimiter } from "../../shared/middleware/rateLimiter";
import { validate } from "../../shared/middleware/validate";
import { createPageSchema } from "./schema/page-create.schema";
import { createPageController, getPageController } from "./page.controller";
import { getPageSchema } from "./schema/page-get.schema";

const pageRouter = Router();
pageRouter.use(requireAuth, requireAdmin, createRateLimiter({ limit: 120, windowMs: 60_000 }));
pageRouter.post("/", validate(createPageSchema), createPageController);
pageRouter.get("/:id", validate(getPageSchema, "params"), getPageController); 

export default pageRouter;