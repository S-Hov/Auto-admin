import type { AdminLookupRow, RequestMeta, UserRole } from "../register.types";

export interface RegisterAdminRepository {
    getRoleByKey(key: string): Promise<UserRole | undefined>;

    register(
        roleId: number,
        name: string,
        passwordHash: string,
    ): Promise<number>;

    registerLogger(meta: RequestMeta, userId: number): Promise<void>;

    getAdminByRoleId(roleId: number): Promise<AdminLookupRow | undefined>;
}
