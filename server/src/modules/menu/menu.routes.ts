import { Router } from "express";
import { requireAdmin, requireAuth } from "../../shared/middleware/auth.middleware";
import { validate } from '../../shared/middleware/validate';
import { menuSaveSchema, menuPermissionSchema, menuDeleteParamsSchema } from './schema/menu.schema';
import { createRateLimiter } from "../../shared/middleware/rateLimiter";
import { deleteMenuController, getManageableMenuController, getMenuController, menuPermissionsController, saveMenuController } from "./menu.controller";

const menuRouter = Router();
menuRouter.use(requireAuth, createRateLimiter({ limit: 120, windowMs: 60_000 }));
menuRouter.get("/", getMenuController);
menuRouter.use(requireAdmin);
menuRouter.get("/manage", getManageableMenuController);
menuRouter.post("/", validate(menuSaveSchema), saveMenuController);
menuRouter.delete("/:id", validate(menuDeleteParamsSchema, 'params'), deleteMenuController);
menuRouter.put("/permissions", validate(menuPermissionSchema), menuPermissionsController);
export default menuRouter;
