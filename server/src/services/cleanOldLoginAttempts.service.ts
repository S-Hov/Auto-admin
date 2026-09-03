import { cleanOldLoginAttempts } from "../modules/auth";

export const cleanOldLoginAttemptsService = async (days: number = 30) => {
    const startTime = Date.now();
    const deletedCount = await cleanOldLoginAttempts(days);
    console.log({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        service: 'clean-old-login-attempts',
        deletedCount: deletedCount,
        duration: Date.now() - startTime
    });
}