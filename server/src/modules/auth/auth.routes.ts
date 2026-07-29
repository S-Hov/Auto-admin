import express from "express";
import { getMeController, loginController, logoutController } from "./auth.controller";
import { requireAuth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate";
import { loginSchema } from "./schema/login.schema";

const authRouter = express.Router();

authRouter.post('/login', validate(loginSchema), loginController);
authRouter.get('/me', requireAuth, getMeController);
authRouter.post('/logout', logoutController);

export default authRouter