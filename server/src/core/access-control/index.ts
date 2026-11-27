export {
    AccessControlService,
    accessControlService,
} from "./access-control.service";
export { isSystemAdmin } from "./policy/permission.evaluator";
export type {
    AccessPrincipal,
    PreparedAccessContext,
} from "./contracts/access-control.types";
export type { QueryAccessRequirements } from "./contracts/query-access.types";
export type { AccessibleCatalog } from "@auto-admin/contracts/access-control";
