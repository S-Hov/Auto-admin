import type { NextFunction, Request, Response } from "express";
import { badRequest } from "../api/errors/error-helpers";
import { ZodError, type ZodType } from "zod";
import { ERROR_CODES } from "../api/codes/error-codes";
import { mapZodIssue } from "../api/validation/map-zod-issue";

export const validate = (schema: ZodType, target: 'body' | 'params' = 'body') => (req: Request, res: Response, next: NextFunction) => {
    const input: unknown = target === 'body' ? req.body : req.params;
    try {
        const data = schema.parse(input);
        if (target === 'body') req.body = data;
        else res.locals.validatedParams = data;
        next()
    } catch (error) {
        if (error instanceof ZodError) {
            const errors = error.issues.map((issue) => mapZodIssue(issue, input));

            return next(badRequest(ERROR_CODES.COMMON_VALIDATION_FAILED, { details: errors }));
        }

        return next(error)
    }
}
