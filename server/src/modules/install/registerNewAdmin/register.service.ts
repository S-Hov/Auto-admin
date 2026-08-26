import bcrypt from 'bcryptjs';
import type { RequestMeta, RegisterData, RegisterResponse } from "./register.types";
import { getAdminByRoleId, getRoleByKey, register, registerLogger } from './register.repository';
import { conflict, notFound } from '../../../shared/api/errors/error-helpers';
import { getInstallationStatusForUpdate, updateInstallationStatus } from '../install.repository';
import { withTransaction } from '../../../db';
import { PagePaths } from '../../../constants/pagePaths';
import { ERROR_CODES } from '../../../shared/api/codes/error-codes';

const adminRoleKey = 'admin' as const;

export const registerService = async (data: RegisterData, meta: RequestMeta): Promise<RegisterResponse> => {
    const {
        userName,
        password
    } = data;

    const role = await getRoleByKey(adminRoleKey);
    if (!role) throw notFound(ERROR_CODES.INSTALL_ADMIN_ROLE_NOT_FOUND);

    const hashedPassword = await bcrypt.hash(password, 10);

    await withTransaction(async (transaction) => {
        const installationStatus = await getInstallationStatusForUpdate(transaction)
        if (installationStatus?.status !== 'migrated') throw conflict()

        const admin = await getAdminByRoleId(transaction, role.id)
        if (admin) throw conflict(ERROR_CODES.INSTALL_ADMIN_ALREADY_CREATED)

        const adminId = await register(transaction, role.id, userName, hashedPassword);

        await registerLogger(transaction, meta, adminId)

        await updateInstallationStatus(transaction, 'ready')
    })

    return ({ redirectedTo: PagePaths.login })
}