import { cleanOldLoginAttempts } from "../modules/auth";

export const cleanOldLoginAttemptsService = async (days: number = 30) => {
    const startTime = Date.now();
    let deletedCount = 0;
    try {
        deletedCount = await cleanOldLoginAttempts(days);
    }
    catch (error) {
        console.log({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            service: 'clean-old-login-attempts',
            error: error
        });
    }
    console.log({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        service: 'clean-old-login-attempts',
        deletedCount: deletedCount,
        duration: Date.now() - startTime
    });
}