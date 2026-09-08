import { Request } from "express";

export interface RequestMeta {
    ipAddress: string | null,
    userAgent: string | null,
    requestId: string | null,
}

export const getRequestMeta = (req: Request): RequestMeta => ({
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
    requestId: req.requestId ?? null,
})
