import express from "express";
import path from "path";
import fs from "fs";
import { 
    ApplyMigrationsStep,
    checkConnectionController, 
    getMigrationsSteps, 
} from "./install.controller";

const installRouter = express.Router();

installRouter.post("/check-connection", checkConnectionController);

installRouter.get("/migrations/getMigrationsSteps", getMigrationsSteps);

installRouter.post("/migrations/steps/:step", ApplyMigrationsStep);

const pathToRegisterTs = path.join(__dirname, "registerNewAdmin", "register.routes.ts");
const pathToRegisterJs = path.join(__dirname, "registerNewAdmin", "register.routes.js");

if (fs.existsSync(pathToRegisterTs) || fs.existsSync(pathToRegisterJs)) {
    (async () => {
        try {
            const module = await import("./registerNewAdmin/register.routes.js");

            const dynamicRegisterRouter = (module.default || module) as unknown as express.Router;
            
            installRouter.use("/auth", dynamicRegisterRouter);
            console.log("[Install] Роут регистрации админа успешно подключен.");
        } catch (error) {
            console.error("[Install] Ошибка при динамическом импорте роута:", error);
        }
    })();
} else {
    console.log("[Install] Папка registerNewAdmin не найдена. Роут /auth пропущен.");
}


export default installRouter;
