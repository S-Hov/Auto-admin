import express from "express";
import { getMeController, loginController, logoutController } from "./auth.controller";
import { requireAuth } from "../../shared/middleware/auth.middleware";

const authRouter = express.Router();

authRouter.post('/login', loginController);
authRouter.get('/me', requireAuth, getMeController);
authRouter.post('/logout', logoutController);

export default authRouter