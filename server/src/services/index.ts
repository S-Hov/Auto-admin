import { cleanOldLoginAttemptsService } from "./cleanOldLoginAttempts.service";

setInterval(() => {
    cleanOldLoginAttemptsService();
}, 1000 * 60 * 60 * 24);