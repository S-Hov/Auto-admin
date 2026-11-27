import bcrypt from "bcryptjs";
import { PagePaths } from "../../../constants/pagePaths";
import { databaseRuntime } from "../../../db/runtime/database.runtime";
import { ERROR_CODES } from "@auto-admin/contracts/common";
import {
    conflict,
    notFound,
} from "../../../shared/api/errors/error-helpers";
import { createInstallRepository } from "../repository/repository.factory";
import { createRegisterAdminRepository } from "./repository/repository.factory";
import type { RequestMeta } from "./register.types";
import type { RegisterData, RegisterResponse } from "@auto-admin/contracts/install";

const adminRoleKey = "admin" as const;

export const registerService = async (
    data: RegisterData,
    meta: RequestMeta,
): Promise<RegisterResponse> => {
    const { userName, password } = data;

    const normalizedUsername = userName.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);
    const databaseProvider = databaseRuntime.getProvider();

    await databaseProvider.transaction(async (executor) => {
        const transactionInstallRepository = createInstallRepository(
            databaseProvider.type,
            executor,
        );
        const transactionRegisterRepository = createRegisterAdminRepository(
            databaseProvider.type,
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
