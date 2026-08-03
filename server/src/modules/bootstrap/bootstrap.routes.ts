import { Router } from "express";
import { getBootstrapStatusController } from "./bootstrap.controller";

const bootstrapRouter = Router();

bootstrapRouter.get('/status', getBootstrapStatusController);

export default bootstrapRouter;