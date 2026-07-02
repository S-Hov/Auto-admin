export const successResponse = (res: any, status: number, message: string, data?: any) => {
    return res.status(status).json({
        success: true,
        message,
        status,
        data
    });
};

export const errorResponse = (res: any, status: number, message: string, data?: any) => {
    return res.status(status).json({
        success: false,
        message,
        status,
        data
    });
};