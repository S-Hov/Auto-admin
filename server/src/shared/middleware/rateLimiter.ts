import type { NextFunction, Request, Response } from "express";
import { tooManyRequests } from "../api/errors/error-helpers";
import { ERROR_CODES } from "../api/codes/error-codes";

interface RateLimiterOptions {
    limit: number;
    windowMs: number;
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

export const createRateLimiter = ({ limit, windowMs }: RateLimiterOptions) => {
    const entries = new Map<string, RateLimitEntry>();

    const cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, value] of entries) {
            if (value.resetTime <= now) entries.delete(key);
        }
    }, Math.min(windowMs, 60_000));
    cleanupTimer.unref();

    return (req: Request, res: Response, next: NextFunction): void => {
        const now = Date.now();
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        const current = entries.get(key);

        if (!current || current.resetTime <= now) {
            entries.set(key, { count: 1, resetTime: now + windowMs });
            next();
            return;
        }

        if (current.count >= limit) {
            const retryAfter = Math.max(1, Math.ceil((current.resetTime - now) / 1000));
            res.setHeader('Retry-After', String(retryAfter));
            next(tooManyRequests(ERROR_CODES.COMMON_TOO_MANY_REQUESTS, { params: { seconds: retryAfter } }));
            return;
        }

        current.count += 1;
        next();
    };
};
