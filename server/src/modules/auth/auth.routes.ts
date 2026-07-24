import express from "express";
import { loginController } from "./auth.controller";

const authRouter = express.Router();

authRouter.post('/login', loginController)
authRouter.get('/me', loginController)

export default authRouter