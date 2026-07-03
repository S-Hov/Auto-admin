import { ApiError } from './ApiError';

export const badRequest = (
    message = 'Некорректный запрос',
    data?: unknown,
    code = 'COMMON.BAD_REQUEST'
) => {
    return new ApiError(message, 400, code, data);
};

export const unauthorized = (
    message = 'Не авторизован',
    data?: unknown,
    code = 'COMMON.UNAUTHORIZED'
) => {
    return new ApiError(message, 401, code, data);
};

export const forbidden = (
    message = 'Доступ запрещён',
    data?: unknown,
    code = 'COMMON.FORBIDDEN'
) => {
    return new ApiError(message, 403, code, data);
};

export const notFound = (
    message = 'Не найдено',
    data?: unknown,
    code = 'COMMON.NOT_FOUND'
) => {
    return new ApiError(message, 404, code, data);
};

export const internal = (
    message = 'Внутренняя ошибка сервера',
    data?: unknown,
    code = 'COMMON.INTERNAL_ERROR'
) => {
    return new ApiError(message, 500, code, data);
};