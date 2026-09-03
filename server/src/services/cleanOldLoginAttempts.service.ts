import { cleanOldLoginAttempts } from "../modules/auth";
import { readBootstrapStatus } from "../modules/bootstrap";

export const cleanOldLoginAttemptsService = async (days: number = 30) => {
    const startTime = Date.now();
    const bootstrapStatus = await readBootstrapStatus();
    if (bootstrapStatus !== 'ready') {
        console.log({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            service: 'clean-old-login-attempts',
            message: `System is not ready, skipping clean-old-login-attempts (stage: ${bootstrapStatus})`
        });
        return;
    }
    const deletedCount = await cleanOldLoginAttempts(days);
    console.log({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        service: 'clean-old-login-attempts',
        deletedCount: deletedCount,
        duration: Date.now() - startTime
    });
}