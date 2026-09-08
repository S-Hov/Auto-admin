import { cleanOldLoginAttempts } from "../modules/auth";
import { readBootstrapStatus } from "../modules/bootstrap";
import { logger } from "../shared/logger";
import { envConfig } from "../config/env";

export const cleanOldLoginAttemptsService = async (days: number = envConfig.Auto_Admin__LOGIN_ATTEMPT_RETENTION_DAYS) => {
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
