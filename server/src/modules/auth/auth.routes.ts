import express from "express";
import { getMeController, loginController } from "./auth.controller";
import { requireAuth } from "./middleware/auth.middleware";

const authRouter = express.Router();

authRouter.post('/login', loginController)
authRouter.get('/me', requireAuth, getMeController)

export default authRouter