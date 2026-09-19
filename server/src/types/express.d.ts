import type { GetMeServiceResult } from "../modules/auth";

declare global {
    namespace Express {
        interface Request {
            auth?: GetMeServiceResult;
            requestId?: string;
        }
    }
}

export { };