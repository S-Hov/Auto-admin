import type {
    ActiveSessionRow,
    CreateSessionData,
    LoginAttemptsRow,
    LoginAttemptWindows,
    LoginUserRow,
} from "../auth.types";

export interface AuthRepository {
    getUserByUserName(userName: string): Promise<LoginUserRow | undefined>;

    createSession(data: CreateSessionData): Promise<void>;

    getActiveSessionByTokenHash(
        tokenHash: string,
    ): Promise<ActiveSessionRow | undefined>;

    revokeSessionByTokenHash(tokenHash: string): Promise<void>;

    getLoginAttempts(
        username: string,
        ipAddress: string | null,
        windows: LoginAttemptWindows,
    ): Promise<LoginAttemptsRow>;

    createLoginAttempt(
        username: string,
        ipAddress: string | null,
    ): Promise<number>;

    deleteLoginAttemptById(attemptId: number): Promise<void>;

    cleanOldLoginAttempts(days: number): Promise<number>;
}
