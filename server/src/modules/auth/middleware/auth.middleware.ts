import type { NextFunction, Request, Response } from "express";
import { cookieParser } from "../../../utils/cookieParser";

export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
    const cookey = cookieParser(req.cookies);

    
}