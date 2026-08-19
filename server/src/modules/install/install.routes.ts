import express from "express";
import {
    applyNextMigrationController,
    checkConnectionController,
    getMigrationPlanController,
} from "./install.controller";
import registerRouter from "./registerNewAdmin/register.routes";
import { statusMigrated } from "../../shared/middleware/checkInstallationStatus";
import { validate } from "../../shared/middleware/validate";
import { applyNextMigrationSchema } from "./schema/applyNextMigration.schema";
import { requirePendingMigrations } from "../../shared/middleware/requirePendingMigrations";
import { canConfigureDatabase } from "../../shared/middleware/canConfigureDatabase";
import { requireInstallToken } from "../../shared/middleware/requireInstallToken";

const installRouter = express.Router();

installRouter.use(requireInstallToken);

installRouter.post("/check-connection", canConfigureDatabase, checkConnectionController);

installRouter.get("/migrations/plan", requirePendingMigrations, getMigrationPlanController);

installRouter.post("/migrations/apply-next", requirePendingMigrations, validate(applyNextMigrationSchema), applyNextMigrationController);

installRouter.use("/auth", statusMigrated, registerRouter);


export default installRouter;
