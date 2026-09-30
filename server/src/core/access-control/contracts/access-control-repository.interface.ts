import type {
    PermissionRuleSet,
    PermissionRuleSubject,
} from "./access-control-repository.types";

export interface AccessControlRepository {
    getPermissionsForUser(
        subject: PermissionRuleSubject,
    ): Promise<PermissionRuleSet>;
}
