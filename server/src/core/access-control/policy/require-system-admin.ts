import type { AccessPrincipal } from "../contracts/access-control.types";
import { isSystemAdmin } from "./permission.evaluator";
import { ERROR_CODES } from "../../../shared/api/codes/error-codes";
import {
    forbidden,
    unauthorized,
} from "../../../shared/api/errors/error-helpers";

export function requireSystemAdmin(principal: AccessPrincipal): void {
    if (!principal) throw unauthorized();
    if (!isSystemAdmin(principal))
        throw forbidden(ERROR_CODES.ACCESS_ADMIN_REQUIRED);
}
