import type { Response } from 'express';

export const successResponse = (res: Response, status: number, message: string, data?: any) => {
    return res.status(status).json({
        success: true,
        message,
        status,
        data
    });
};

export const errorResponse = (res: Response, status: number, message: string, data?: any) => {
    return res.status(status).json({
        success: false,
        message,
        status,
        data
    });
};