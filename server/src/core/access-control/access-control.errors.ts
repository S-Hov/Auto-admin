import { ERROR_CODES } from "@auto-admin/contracts/common";
import { forbidden } from "../../shared/api/errors/error-helpers";
import type { AccessDecision } from "./contracts/access-control.types";

export function accessDenied(decision: AccessDecision, target: object) {
    return forbidden(ERROR_CODES.ACCESS_QUERY_DENIED, {
        internalMessage: "Query access denied",
        cause: { decision, target },
    });
}
