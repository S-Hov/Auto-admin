import z from 'zod';
import { DATABASE_TYPES } from '../database';

export const checkDatabaseTypeSchema = z.object({
    databaseType: z.enum(DATABASE_TYPES)
})

export type CheckDatabaseType = z.infer<typeof checkDatabaseTypeSchema>;
