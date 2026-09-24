import bcrypt from 'bcryptjs';
import type { RequestMeta, RegisterData, RegisterResponse } from "./register.types";
import { conflict, notFound } from '../../../shared/api/errors/error-helpers';
import { withTransaction } from '../../../db';
import { PagePaths } from '../../../constants/pagePaths';
import { ERROR_CODES } from '../../../shared/api/codes/error-codes';
import { installRepository } from '../repository';
import { registerAdminRepository } from './repository';

const adminRoleKey = 'admin' as const;

export const registerService = async (data: RegisterData, meta: RequestMeta): Promise<RegisterResponse> => {
    const {
        userName,
        password
    } = data;

    const role = await registerAdminRepository.getRoleByKey(adminRoleKey);
    if (!role) throw notFound(ERROR_CODES.INSTALL_ADMIN_ROLE_NOT_FOUND);

    const hashedPassword = await bcrypt.hash(password, 10);

    await withTransaction(async (transaction) => {
        const installationStatus = await installRepository.getInstallationStatusForUpdate();
        if (installationStatus?.status !== 'migrated') throw conflict()

        const admin = await registerAdminRepository.getAdminByRoleId(role.id)
        if (admin) throw conflict(ERROR_CODES.INSTALL_ADMIN_ALREADY_CREATED)

        const adminId = await registerAdminRepository.register(role.id, userName, hashedPassword);

        await registerAdminRepository.registerLogger(meta, adminId)

        await installRepository.updateInstallationStatus('ready')
    })

    return ({ redirectedTo: PagePaths.login })
}