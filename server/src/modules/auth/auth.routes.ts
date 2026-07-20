import express from "express";
import { loginController } from "./auth.controller";

const authRouter = express.Router();

authRouter.post('/login', loginController)

authRouter.post('/logout')

authRouter.get('/me')