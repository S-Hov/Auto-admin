import express from "express";
import installRouter from "../modules/install/install.routes";
import authRouter from "../modules/auth/auth.routes";
import { statusReady } from "../shared/middleware/checkInstallationStatus";
import bootstrapRouter from "../modules/bootstrap/bootstrap.routes";

const ApiRouter = express.Router();

ApiRouter.use("/install", installRouter);
ApiRouter.use("/auth", statusReady, authRouter);
ApiRouter.use("/bootstrap", bootstrapRouter);

export default ApiRouter;
