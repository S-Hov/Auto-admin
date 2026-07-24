import { GetMeServiceResult } from "../modules/auth/auth.types";

declare global {
    namespace Express {
        interface Request {
            auth?: GetMeServiceResult;
        }
    }
}

export { };