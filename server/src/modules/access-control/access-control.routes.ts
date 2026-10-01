import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware";
import { createRateLimiter } from "../../shared/middleware/rateLimiter";
import { accessibleCatalogController, changePermissionsController, listPermissionsController, scanSchemaController } from "./access-control.controller";

const accessRouter = Router();
accessRouter.use(requireAuth, createRateLimiter({ limit: 120, windowMs: 60_000 }));
accessRouter.get("/catalog", accessibleCatalogController);
accessRouter.get("/permissions/:subjectType/:subjectId", listPermissionsController);
accessRouter.put("/permissions", changePermissionsController);
accessRouter.post("/scan", createRateLimiter({ limit: 3, windowMs: 60_000 }), scanSchemaController);

export default accessRouter;
