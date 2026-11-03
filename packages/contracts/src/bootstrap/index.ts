import { apiResponseSchema } from "../common";
import { z } from "zod";

export const bootstrapStageSchema = z.enum([
    "system_configuration_required",
    "database_required",
    "database_unavailable",
    "migrations_required",
    "migration_recovery_required",
    "admin_required",
    "ready",
    "system_error",
]);
export const bootstrapStatusSchema = z.looseObject({
    stage: bootstrapStageSchema,
});
export const bootstrapResponseSchema = apiResponseSchema(bootstrapStatusSchema);

export type BootstrapStage = z.infer<typeof bootstrapStageSchema>;
export type BootstrapStatusResponse = z.infer<typeof bootstrapStatusSchema>;
