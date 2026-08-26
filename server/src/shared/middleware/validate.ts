import { NextFunction, Request, Response } from "express";
import { badRequest } from "../api/errors/error-helpers";
import { ZodError, ZodType } from "zod";
import { ERROR_CODES } from "../api/codes/error-codes";

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

            return next(badRequest(ERROR_CODES.COMMON_BAD_REQUEST, { details: errors }));
        }

        return next(error)
    }
}