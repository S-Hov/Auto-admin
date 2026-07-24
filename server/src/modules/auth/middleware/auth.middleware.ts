import type { NextFunction, Request, Response } from "express";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.Auto_Admin_session;

    next()
}