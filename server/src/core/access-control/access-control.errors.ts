import { ERROR_CODES } from "../../shared/api/codes/error-codes";
import { forbidden } from "../../shared/api/errors/error-helpers";
import type { AccessDecision } from "./contracts/access-control.types";

export function accessDenied(decision: AccessDecision, target: object) {
    return forbidden(ERROR_CODES.ACCESS_QUERY_DENIED, {
        internalMessage: "Query access denied",
        cause: { decision, target },
    });
}
