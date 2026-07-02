import express from "express";
import { checkConnectionController } from "./install.controller";

const installRouter = express.Router();

installRouter.post("/check-connection", checkConnectionController);

export default installRouter;