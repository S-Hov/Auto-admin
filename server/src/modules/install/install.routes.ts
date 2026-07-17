import express from "express";
import { 
    ApplyMigrationsStep,
    checkConnectionController, 
    getMigrationsSteps, 
} from "./install.controller";
import registerRouter from "./registerNewAdmin/register.routes";
import { statusMigrated } from "../../shared/middleware/checkInstallationStatus";

const installRouter = express.Router();

installRouter.post("/check-connection", checkConnectionController);

installRouter.get("/migrations/getMigrationsSteps", getMigrationsSteps);

installRouter.post("/migrations/steps/:step", ApplyMigrationsStep);

installRouter.use("/auth", statusMigrated, registerRouter);


export default installRouter;
