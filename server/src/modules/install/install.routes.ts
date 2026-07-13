import express from "express";
import { 
    ApplyMigrationsStep,
    checkConnectionController, 
    getMigrationsFirstStep, 
    getMigrationsSteps, 
} from "./install.controller";

const installRouter = express.Router();

installRouter.post("/check-connection", checkConnectionController);

installRouter.get("/migrations/getFirstStep", getMigrationsFirstStep);

installRouter.get("/migrations/getMigrationsSteps", getMigrationsSteps);

installRouter.post("/migrations/steps/:step", ApplyMigrationsStep);

export default installRouter;