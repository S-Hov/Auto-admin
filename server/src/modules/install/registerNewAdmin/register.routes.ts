import express from "express";
import { registerController } from "./register.controller";
import { validate } from "./middleware/validateAuth";
import { registerSchema } from "./middleware/schema";

const registerRouter = express.Router();

registerRouter.post('/register',  validate(registerSchema), registerController);