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

const installRouter = express.Router();

installRouter.post("/check-connection", checkConnectionController);

installRouter.get("/migrations/plan", getMigrationPlanController);

installRouter.post("/migrations/apply-next", validate(applyNextMigrationSchema), applyNextMigrationController);

installRouter.use("/auth", statusMigrated, registerRouter);


export default installRouter;
