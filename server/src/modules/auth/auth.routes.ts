import express from "express";
import { getMeController, loginController, logoutController } from "./auth.controller";
import { requireAuth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate";
import { loginSchema } from "./schema/login.schema";
import { createRateLimiter } from "../../shared/middleware/rateLimiter";
import { envConfig } from "../../config/env";

const authRouter = express.Router();
const loginRateLimiter = createRateLimiter({
    limit: envConfig.Auto_Admin__LOGIN_RATE_LIMIT,
    windowMs: envConfig.Auto_Admin__LOGIN_RATE_WINDOW_MS,
});

authRouter.post('/login', loginRateLimiter, validate(loginSchema), loginController);
authRouter.get('/me', requireAuth, getMeController);
authRouter.post('/logout', logoutController);

export default authRouter
