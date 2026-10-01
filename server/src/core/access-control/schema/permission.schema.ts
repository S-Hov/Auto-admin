import { z } from "zod";
import {
    FIELD_PERMISSION_ACTIONS,
    RESOURCE_PERMISSION_ACTIONS,
    PERMISSION_SUBJECT_TYPES,
    PERMISSION_EFFECTS,
} from "../contracts/permission.constants";
import type { PermissionChange } from "../contracts/permission-management.types";
import { badRequest } from "../../../shared/api/errors/error-helpers";
import { ERROR_CODES } from "../../../shared/api/codes/error-codes";

export const positiveIdSchema = z
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER);
const common = {
    subjectType: z.enum(PERMISSION_SUBJECT_TYPES),
    subjectId: positiveIdSchema,
    targetId: positiveIdSchema,
    effect: z.enum(PERMISSION_EFFECTS).nullable(),
};
export const permissionChangeSchema = z.discriminatedUnion("targetType", [
    z.strictObject({
        ...common,
        targetType: z.literal("resource"),
        action: z.enum(RESOURCE_PERMISSION_ACTIONS),
    }),
    z.strictObject({
        ...common,
        targetType: z.literal("field"),
        action: z.enum(FIELD_PERMISSION_ACTIONS),
    }),
]);
export const permissionSubjectSchema = z.strictObject({
    subjectType: z.enum(PERMISSION_SUBJECT_TYPES),
    subjectId: positiveIdSchema,
});

export function parsePermissionChange(input: unknown): PermissionChange {
    const result = permissionChangeSchema.safeParse(input);
    if (!result.success)
        throw badRequest(ERROR_CODES.COMMON_VALIDATION_FAILED, {
            cause: result.error,
        });
    return result.data;
}
