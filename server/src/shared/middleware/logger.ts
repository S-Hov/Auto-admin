import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

export const logger = (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.requestId || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const start = performance.now();

    next();

    res.on('finish', () => {
        const duration = Math.round(performance.now() - start);

        console.log({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            ip: req.ip,
        })
    })
}