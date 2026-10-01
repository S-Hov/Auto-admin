import express from "express";
import installRouter from "../modules/install/install.routes";
import authRouter from "../modules/auth/auth.routes";
import { statusReady } from "../shared/middleware/checkInstallationStatus";
import bootstrapRouter from "../modules/bootstrap/bootstrap.routes";
import queryRouter from "../modules/query/query.routes";
import accessRouter from "../modules/access-control/access-control.routes";
import menuRouter from "../modules/menu/menu.routes";

const ApiRouter = express.Router();

ApiRouter.use("/install", installRouter);
ApiRouter.use("/auth", statusReady, authRouter);
ApiRouter.use("/bootstrap", bootstrapRouter);
ApiRouter.use("/query", statusReady, queryRouter);
ApiRouter.use("/access", statusReady, accessRouter);
ApiRouter.use("/menu", statusReady, menuRouter);

export default ApiRouter;
