import type { z } from 'zod';
import type { authUserSchema, loginDataSchema, logoutDataSchema } from './auth.schema';

export interface LoginRequest {
    userName: string;
    password: string;
}

export type LoginResponse = z.infer<typeof loginDataSchema>;
export type LogoutResponse = z.infer<typeof logoutDataSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
