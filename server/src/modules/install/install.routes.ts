import express from "express";
import { checkConnectionController, getMigrationsFirstStep, registerController } from "./install.controller";

const installRouter = express.Router();

installRouter.post("/check-connection", checkConnectionController);

installRouter.get("/migrations/getFirstStep", getMigrationsFirstStep);

installRouter.post("/register", registerController);

export default installRouter;