import bcrypt from "bcryptjs";
import { PagePaths } from "../../../constants/pagePaths";
import { activeDatabaseProvider } from "../../../db/runtime/database.runtime";
import { ERROR_CODES } from "../../../shared/api/codes/error-codes";
import {
    conflict,
    notFound,
} from "../../../shared/api/errors/error-helpers";
import { createInstallRepository } from "../repository";
import { createRegisterAdminRepository } from "./repository";
import type {
    RequestMeta,
    RegisterData,
    RegisterResponse,
} from "./register.types";

const adminRoleKey = "admin" as const;

export const registerService = async (
    data: RegisterData,
    meta: RequestMeta,
): Promise<RegisterResponse> => {
    const { userName, password } = data;

    const normalizedUsername = userName.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    await activeDatabaseProvider.transaction(async (executor) => {
        const transactionInstallRepository = createInstallRepository(
            activeDatabaseProvider.type,
            executor,
        );
        const transactionRegisterRepository = createRegisterAdminRepository(
            activeDatabaseProvider.type,
            executor,
        );

        const installationStatus =
            await transactionInstallRepository.getInstallationStatusForUpdate();
        if (installationStatus?.status !== "migrated") {
            throw conflict();
        }

        const role =
            await transactionRegisterRepository.getRoleByKey(adminRoleKey);
        if (!role) throw notFound(ERROR_CODES.INSTALL_ADMIN_ROLE_NOT_FOUND);

        const admin =
            await transactionRegisterRepository.getAdminByRoleId(role.id);
        if (admin) {
            throw conflict(ERROR_CODES.INSTALL_ADMIN_ALREADY_CREATED);
        }

        const adminId = await transactionRegisterRepository.register(
            role.id,
            normalizedUsername,
            hashedPassword,
        );

        await transactionRegisterRepository.registerLogger(meta, adminId);

        await transactionInstallRepository.updateInstallationStatus("ready");
    });

    return { redirectedTo: PagePaths.login };
};
