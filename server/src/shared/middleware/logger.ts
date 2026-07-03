import { Request, Response, NextFunction } from 'express';

export const logger = (req: Request, _res: Response, next: NextFunction): void => {
    console.log(`[${new Date().toISOString()}]\tmethod: ${req.method}\turl: ${req.url}`);

    next();
}