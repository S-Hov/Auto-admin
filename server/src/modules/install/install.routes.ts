import express from "express";
import {
    applyNextMigrationController,
    checkConnectionController,
    getMigrationPlanController,
    markMigrationAppliedController,
    recoveryMigrationController,
    retryMigrationController,
} from "./install.controller";
import registerRouter from "./registerNewAdmin/register.routes";
import { statusMigrated } from "../../shared/middleware/checkInstallationStatus";
import { validate } from "../../shared/middleware/validate";
import { applyNextMigrationSchema } from "./schema/applyNextMigration.schema";
import { requirePendingMigrations } from "../../shared/middleware/requirePendingMigrations";
import { canConfigureDatabase } from "../../shared/middleware/canConfigureDatabase";
import { requireInstallToken } from "../../shared/middleware/requireInstallToken";
import { checkConnectionSchema } from "./schema/checkConnection.schema";
import { recoverySchema } from "./schema/recovery.schema";
import { createRateLimiter } from "../../shared/middleware/rateLimiter";
import { envConfig } from "../../config/env";
import { requireMigrationRecovery } from "../../shared/middleware/requireMigrationRecovery";

const installRouter = express.Router();
const installRateLimiter = createRateLimiter({
    limit: envConfig.Auto_Admin__INSTALL_RATE_LIMIT,
    windowMs: envConfig.Auto_Admin__INSTALL_RATE_WINDOW_MS,
});

installRouter.use(requireInstallToken);

installRouter.post("/check-connection", installRateLimiter, canConfigureDatabase, validate(checkConnectionSchema), checkConnectionController);

installRouter.get("/migrations/plan", requirePendingMigrations, getMigrationPlanController);

installRouter.post("/migrations/retry", installRateLimiter, requireMigrationRecovery, validate(recoverySchema), retryMigrationController);

installRouter.post("/migrations/mark-applied", installRateLimiter, requireMigrationRecovery, validate(recoverySchema), markMigrationAppliedController);

installRouter.get("/migrations/recovery", installRateLimiter, requireMigrationRecovery, recoveryMigrationController);

installRouter.post("/migrations/apply-next", requirePendingMigrations, validate(applyNextMigrationSchema), applyNextMigrationController);

installRouter.use("/auth", installRateLimiter, statusMigrated, registerRouter);


export default installRouter;
