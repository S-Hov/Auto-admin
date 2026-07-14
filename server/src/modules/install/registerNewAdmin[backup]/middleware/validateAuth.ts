import { NextFunction, Request, Response } from "express";
import { badRequest } from "../../../../shared/api/errors/error-helpers";
import { ZodError, ZodType } from "zod";

export const validate = (schema: ZodType ) => (req: Request, _res: Response, next: NextFunction) => {
    try {
        req.body = schema.parse(req.body)
        next()
    } catch (error) {
        if (error instanceof ZodError) {
            const errors = error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            }));

            return next(badRequest('Ошибка валидации', errors));
        }

        return next(error)
    }
}