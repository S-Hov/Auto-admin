import { ResultSetHeader } from "mysql2";
import { getPool } from "../../db"
import { ActiveSessionRow, CreateSessionData, LoginAttemptsRow, LoginUserRow } from "./auth.types";

export const getUserByUserName = async (userName: string): Promise<LoginUserRow | undefined> => {
    const [user] = await getPool().query<LoginUserRow[]>(`
        SELECT id, role_id, username, password_hash, is_active FROM Auto_Admin__users
        WHERE username = ?
    `, [userName]);

    return user[0];
}

export const createSession = async (data: CreateSessionData): Promise<void> => {
    await getPool().query(`
        INSERT INTO Auto_Admin__sessions (user_id, token_hash, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
    `, [data.user_id, data.token_hash, data.expires_at, data.ip_address, data.user_agent]);
};

export const getActiveSessionByTokenHash = async (tokenHash: string): Promise<ActiveSessionRow | undefined> => {
    const [session] = await getPool().query<ActiveSessionRow[]>(`
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
    `, [tokenHash]);

    return session[0]
}

export const revokeSessionByTokenHash = async (tokenHash: string): Promise<void> => {
    await getPool().query(`
        UPDATE Auto_Admin__sessions
        SET revoked_at = NOW()
        WHERE token_hash = ?
        AND revoked_at IS NULL
    `, [tokenHash]);
}

export const getLoginAttempts = async (username: string, ipAddress: string | null): Promise<LoginAttemptsRow> => {
    const [attempts] = await getPool().query<LoginAttemptsRow[]>(`
        SELECT 
            -- 1. Попытки пользователя со ВСЕХ IP (за последние 15 минут)
            COALESCE(SUM(CASE WHEN username = ? AND created_at >= NOW() - INTERVAL 15 MINUTE THEN 1 ELSE 0 END), 0) AS userCount15m,
            
            -- 2. Все попытки с текущего IP адреса (за последние 24 часа)
            COALESCE(SUM(CASE WHEN ip_address <=> ? AND created_at >= NOW() - INTERVAL 1 DAY THEN 1 ELSE 0 END), 0) AS ipCount1d,
            
            -- 3. (Опционально) Попытки этого пользователя с этого конкретного IP (за 15 минут)
            COALESCE(SUM(CASE WHEN ip_address <=> ? AND username = ? AND created_at >= NOW() - INTERVAL 15 MINUTE THEN 1 ELSE 0 END), 0) AS ipUserCount15m
        FROM Auto_Admin__login_attempts 
        WHERE (ip_address <=> ? OR username = ?) 
        AND created_at >= NOW() - INTERVAL 1 DAY;
    `, [
        username,              // для userCount15m
        ipAddress,             // для ipCount1d
        ipAddress, username,   // для ipUserCount15m
        ipAddress, username    // для WHERE
    ]);

    const row = attempts[0];
    return {
        ...row,
        userCount15m: Number(row?.userCount15m ?? 0),
        ipCount1d: Number(row?.ipCount1d ?? 0),
        ipUserCount15m: Number(row?.ipUserCount15m ?? 0),
    };
};

export const createLoginAttempt = async (username: string, ipAddress: string | null): Promise<number> => {
    const [result] = await getPool().query<ResultSetHeader>(`
        INSERT INTO Auto_Admin__login_attempts (username, ip_address)
        VALUES (?, ?)
    `, [username, ipAddress]);

    return result.insertId;
};

export const deleteLoginAttemptById = async (attemptId: number): Promise<void> => {
    await getPool().query(`
        DELETE FROM Auto_Admin__login_attempts
        WHERE id = ?
    `, [attemptId]);
};