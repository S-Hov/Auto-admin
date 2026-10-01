import type {
    PermissionRuleSet,
    PermissionRuleSubject,
} from "./access-control-repository.types";
import type {
    PermissionChange,
    PermissionTarget,
    StoredPermission,
} from "./permission-management.types";
import type {
    PermissionEffect,
    PermissionSubjectType,
} from "./permission.types";

export interface AccessControlRepository {
    getPermissionsForUser(
        subject: PermissionRuleSubject,
    ): Promise<PermissionRuleSet>;
    isActiveSystemAdminForUpdate(userId: number): Promise<boolean>;
    subjectExists(
        subjectType: PermissionSubjectType,
        subjectId: number,
    ): Promise<boolean>;
    getTargetForUpdate(
        change: PermissionChange,
    ): Promise<PermissionTarget | null>;
    getPermissionForUpdate(
        change: PermissionChange,
    ): Promise<PermissionEffect | null>;
    setPermission(change: PermissionChange): Promise<void>;
    appendAudit(
        change: PermissionChange,
        previousEffect: PermissionEffect | null,
        actorUserId: number,
        requestId: string | null,
    ): Promise<void>;
    listPermissions(
        subjectType: PermissionSubjectType,
        subjectId: number,
    ): Promise<StoredPermission[]>;
}
