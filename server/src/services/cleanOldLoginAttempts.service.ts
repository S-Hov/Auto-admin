import { cleanOldLoginAttempts } from "../modules/auth";
import { readBootstrapStatus } from "../modules/bootstrap";
import { logger } from "../shared/logger";

export const cleanOldLoginAttemptsService = async (days: number = 30) => {
    const startTime = Date.now();
    const bootstrapStatus = await readBootstrapStatus();
    if (bootstrapStatus !== 'ready') {
        logger.info({
            service: 'clean-old-login-attempts',
        }, `System is not ready, skipping clean-old-login-attempts (stage: ${bootstrapStatus})`);
        return;
    }
    const deletedCount = await cleanOldLoginAttempts(days);
    logger.info({
        service: 'clean-old-login-attempts',
        deletedCount,
        duration: Date.now() - startTime
    }, `Cleaned ${deletedCount} old login attempts in ${Date.now() - startTime}ms`);
}