import type { NextFunction, Request, Response } from "express";
import { tooManyRequests } from "../api/errors/error-helpers";

const rateLimit = new Map<string, { count: number, resetTime: number }>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const limit = 10;
    const windowInMs = 60 * 1000;
    const ip = req.ip;

    if (!ip) {
        return next();
    }

    const limitInfo = rateLimit.get(ip);

    if (limitInfo) {
        if (limitInfo.resetTime < Date.now()) {
            rateLimit.delete(ip);
            rateLimit.set(ip, { count: 1, resetTime: Date.now() + windowInMs });
            return next();
        }
        if (limitInfo.resetTime > Date.now() && limitInfo.count > limit) {
            const retryAfter = Math.ceil((limitInfo.resetTime - Date.now()) / 1000);
            res.setHeader('Retry-After', String(retryAfter));
            return next(tooManyRequests());
        }
        limitInfo.count++;
        rateLimit.set(ip, limitInfo);
        return next();
    }

    rateLimit.set(ip, { count: 1, resetTime: Date.now() + windowInMs });
    next();

    setInterval(() => {
        for (const [key, value] of rateLimit){
            if (value.resetTime < Date.now()) {
                rateLimit.delete(key);
            }
        }
    }, 10 * 1000).unref();
}