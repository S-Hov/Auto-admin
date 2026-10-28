import type { NextFunction, Request, Response } from "express";
import { badRequest } from "../api/errors/error-helpers";
import { ZodError, type ZodType } from "zod";
import { ERROR_CODES } from "../api/codes/error-codes";
import { mapZodIssue } from "../api/validation/map-zod-issue";

export const validate = (schema: ZodType, target: 'body' | 'params' | 'query' = 'body') => (req: Request, res: Response, next: NextFunction) => {
    const input: unknown = target === 'body' ? req.body : target === 'params' ? req.params : req.query;
    try {
        const data = schema.parse(input);
        if (target === 'body') req.body = data;
        else if (target === 'params') res.locals.validatedParams = data;
        // req.query в Express 5 — getter, поэтому результат храним отдельно.
        else res.locals.validatedQuery = data;
        next()
    } catch (error) {
        if (error instanceof ZodError) {
            const errors = error.issues.map((issue) => mapZodIssue(issue, input));

            return next(badRequest(ERROR_CODES.COMMON_VALIDATION_FAILED, { details: errors }));
        }

        return next(error)
    }
}
