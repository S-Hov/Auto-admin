import { permissionChangeSchema, type PermissionChange } from '@auto-admin/contracts/access-control';
import { badRequest } from '../../../shared/api/errors/error-helpers';
import { ERROR_CODES } from '../../../shared/api/codes/error-codes';
export { positiveIdSchema, permissionChangeSchema, permissionSubjectSchema } from '@auto-admin/contracts/access-control';
export function parsePermissionChange(input: unknown): PermissionChange {
    const result = permissionChangeSchema.safeParse(input);
    if (!result.success)
        throw badRequest(ERROR_CODES.COMMON_VALIDATION_FAILED, {
            cause: result.error,
        });
    return result.data;
}
