export * from "./login.schema";
export * from "./auth-response.schema";
import type { z } from 'zod';
import type { authUserSchema, loginDataSchema, logoutDataSchema } from './auth-response.schema';
export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginResponse = z.infer<typeof loginDataSchema>;
export type LogoutResponse = z.infer<typeof logoutDataSchema>;
