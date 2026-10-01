import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware";
import { createRateLimiter } from "../../shared/middleware/rateLimiter";
import { deleteMenuController, getManageableMenuController, getMenuController, menuPermissionsController, saveMenuController } from "./menu.controller";

const menuRouter = Router();
menuRouter.use(requireAuth, createRateLimiter({ limit: 120, windowMs: 60_000 }));
menuRouter.get("/", getMenuController);
menuRouter.get("/manage", getManageableMenuController);
menuRouter.post("/", saveMenuController);
menuRouter.delete("/:id", deleteMenuController);
menuRouter.put("/permissions", menuPermissionsController);
export default menuRouter;
