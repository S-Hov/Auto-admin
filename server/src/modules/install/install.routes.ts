import express from "express";
import path from "path";
import fs from "fs";
import { 
    ApplyMigrationsStep,
    checkConnectionController, 
    getMigrationsSteps, 
} from "./install.controller";
import { badRequest, internal } from "../../shared/api/errors/error-helpers";

const installRouter = express.Router();

installRouter.post("/check-connection", checkConnectionController);

installRouter.get("/migrations/getMigrationsSteps", getMigrationsSteps);

installRouter.post("/migrations/steps/:step", ApplyMigrationsStep);

const pathToRegisterTs = path.join(__dirname, "registerNewAdmin", "register.routes.ts");
const pathToRegisterJs = path.join(__dirname, "registerNewAdmin", "register.routes.js");

const dynamicAuthMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const exists = fs.existsSync(pathToRegisterTs) || fs.existsSync(pathToRegisterJs);

    if (!exists) {
        return badRequest('Регистрация администратора уже была выполнена.')
    }

    try {
        const module = await import("./registerNewAdmin/register.routes.js");
        const dynamicRegisterRouter = (module.default || module) as unknown as express.Router;
        
        dynamicRegisterRouter(req, res, next);
    } catch (error) {
        console.error("[Install] Ошибка при динамическом импорте роута:", error);
        internal();
    }
};

installRouter.use("/auth", dynamicAuthMiddleware);


export default installRouter;
