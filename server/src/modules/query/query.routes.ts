import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware";
import { createRateLimiter } from "../../shared/middleware/rateLimiter";
import { executePipelineController, executeQueryController } from "./query.controller";

const queryRouter = Router();
queryRouter.use(requireAuth, createRateLimiter({ limit: 120, windowMs: 60_000 }));
queryRouter.post("/execute", executeQueryController);
queryRouter.post("/pipeline", executePipelineController);

export default queryRouter;
