import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { logger } from '../logger';

export const httpLogger = (req: Request, res: Response, next: NextFunction): void => {
    const rawReqId = req.get('x-request-id');
    const requestId = (rawReqId && rawReqId.length <= 64) ? rawReqId : randomUUID();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const startTime = performance.now();

    res.on('finish', () => {
        const duration = Math.round(performance.now() - startTime);
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

        logger[level]({
            requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
        }, `${req.method} ${req.url} ${res.statusCode} in ${duration}ms`);
    });

    next();
};