import { z } from "zod";
import {
    FIELD_PERMISSION_ACTIONS,
    RESOURCE_PERMISSION_ACTIONS,
    PERMISSION_SUBJECT_TYPES,
    PERMISSION_EFFECTS,
} from "./permission.constants";

export { positiveIdSchema } from '../common';
import { positiveIdSchema } from '../common';
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


export type PermissionChange = z.infer<typeof permissionChangeSchema>;
export type PermissionSubject = z.infer<typeof permissionSubjectSchema>;
