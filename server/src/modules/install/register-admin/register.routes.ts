import express from "express";
import { registerController } from "./register.controller";
import { validate } from "../../../shared/middleware/validate";
import { registerSchema } from "./schema/register.schema";

const registerRouter = express.Router();

registerRouter.post('/register',  validate(registerSchema), registerController);

export default registerRouter;