import express from "express";

const authRouter = express.Router();

authRouter.post('/login')

authRouter.post('/logout')

authRouter.get('/me')