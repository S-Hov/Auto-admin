import express from "express";
import installRouter from "../modules/install/install.routes";
import authRouter from "../modules/auth/auth.routes";
import { statusReady } from "../shared/middleware/checkInstallationStatus";

const ApiRouter = express.Router();

ApiRouter.use("/install", installRouter);
ApiRouter.use("/auth", statusReady, authRouter);

export default ApiRouter;
