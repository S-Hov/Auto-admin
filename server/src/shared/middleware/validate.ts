import { NextFunction, Request, Response } from "express";
import { badRequest } from "../api/errors/error-helpers";
import { ZodError, ZodType } from "zod";
import { ERROR_CODES } from "../api/codes/error-codes";
import { mapZodIssue } from "../api/validation/map-zod-issue";
import { ZodIssue } from "zod/v3";

export const validate = (schema: ZodType ) => (req: Request, _res: Response, next: NextFunction) => {
    try {
        req.body = schema.parse(req.body)
        next()
    } catch (error) {
        if (error instanceof ZodError) {
            const errors = error.issues.map((issue) => mapZodIssue(issue as ZodIssue));

            return next(badRequest(ERROR_CODES.COMMON_VALIDATION_FAILED, { details: errors }));
        }

        return next(error)
    }
}