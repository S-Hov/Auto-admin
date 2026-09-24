import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import type {
    ActiveSessionRow,
    CreateSessionData,
    LoginAttemptsRow,
    LoginAttemptWindows,
    LoginUserRow,
} from "../../auth.types";
import type { AuthRepository } from "../repository.interface";

export class MySqlAuthRepository implements AuthRepository {
    constructor(private readonly executor: DatabaseExecutor) {}

    async getUserByUserName(
        userName: string,
    ): Promise<LoginUserRow | undefined> {
        const users = await this.executor.queryRows<LoginUserRow>(
            `
                SELECT id, role_id, username, password_hash, is_active
                FROM Auto_Admin__users
                WHERE username = ?
            `,
            [userName],
        );

        return users[0];
    }

    async createSession(data: CreateSessionData): Promise<void> {
        await this.executor.execute(
            `
                INSERT INTO Auto_Admin__sessions
                    (user_id, token_hash, expires_at, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            `,
            [
                data.user_id,
                data.token_hash,
                data.expires_at,
                data.ip_address,
                data.user_agent,
            ],
        );
    }

    async getActiveSessionByTokenHash(
        tokenHash: string,
    ): Promise<ActiveSessionRow | undefined> {
        const sessions = await this.executor.queryRows<ActiveSessionRow>(
            `
                SELECT
                    ses.id AS sessionId,
                    usr.id AS userId,
                    usr.username,
                    usr.role_id AS roleId,
                    role.\`key\` AS roleKey,
                    role.rights AS rights,
                    ses.expires_at AS expiresAt
                FROM Auto_Admin__sessions AS ses
                JOIN Auto_Admin__users AS usr ON ses.user_id = usr.id
                JOIN Auto_Admin__roles AS role ON usr.role_id = role.id
                WHERE ses.token_hash = ?
                    AND ses.revoked_at IS NULL
                    AND ses.expires_at > NOW()
                    AND usr.is_active = true
            `,
            [tokenHash],
        );

        return sessions[0];
    }

    async revokeSessionByTokenHash(tokenHash: string): Promise<void> {
        await this.executor.execute(
            `
                UPDATE Auto_Admin__sessions
                SET revoked_at = NOW()
                WHERE token_hash = ?
                    AND revoked_at IS NULL
            `,
            [tokenHash],
        );
    }

    async getLoginAttempts(
        username: string,
        ipAddress: string | null,
        windows: LoginAttemptWindows,
    ): Promise<LoginAttemptsRow> {
        const attempts = await this.executor.queryRows<LoginAttemptsRow>(
            `
                SELECT
                    COALESCE(SUM(CASE
                        WHEN username = ?
                            AND created_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)
                        THEN 1 ELSE 0
                    END), 0) AS userCountInWindow,
                    COALESCE(SUM(CASE
                        WHEN ip_address <=> ?
                            AND created_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)
                        THEN 1 ELSE 0
                    END), 0) AS ipCountInWindow,
                    COALESCE(SUM(CASE
                        WHEN ip_address <=> ?
                            AND username = ?
                            AND created_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)
                        THEN 1 ELSE 0
                    END), 0) AS ipUserCountInWindow
                FROM Auto_Admin__login_attempts
                WHERE (ip_address <=> ? OR username = ?)
                    AND created_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)
            `,
            [
                username,
                windows.shortWindowSeconds,
                ipAddress,
                windows.ipWindowSeconds,
                ipAddress,
                username,
                windows.shortWindowSeconds,
                ipAddress,
                username,
                windows.ipWindowSeconds,
            ],
        );

        const row = attempts[0];
        return {
            userCountInWindow: Number(row?.userCountInWindow ?? 0),
            ipCountInWindow: Number(row?.ipCountInWindow ?? 0),
            ipUserCountInWindow: Number(row?.ipUserCountInWindow ?? 0),
        };
    }

    async createLoginAttempt(
        username: string,
        ipAddress: string | null,
    ): Promise<number> {
        const result = await this.executor.execute(
            `
                INSERT INTO Auto_Admin__login_attempts (username, ip_address)
                VALUES (?, ?)
            `,
            [username, ipAddress],
        );

        if (typeof result.insertId !== "number") {
            throw new Error("Database did not return a login attempt id");
        }

        return result.insertId;
    }

    async deleteLoginAttemptById(attemptId: number): Promise<void> {
        await this.executor.execute(
            `
                DELETE FROM Auto_Admin__login_attempts
                WHERE id = ?
            `,
            [attemptId],
        );
    }

    async cleanOldLoginAttempts(days: number): Promise<number> {
        const result = await this.executor.execute(
            `
                DELETE FROM Auto_Admin__login_attempts
                WHERE created_at < NOW() - INTERVAL ? DAY
            `,
            [days],
        );

        return result.affectedRows;
    }
}
