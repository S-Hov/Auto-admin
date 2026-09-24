import { beforeEach, describe, expect, it, vi } from "vitest";
import { PagePaths } from "../../../constants/pagePaths";
import { activeDatabaseProvider } from "../../../db/runtime/database.runtime";
import { ERROR_CODES } from "../../../shared/api/codes/error-codes";
import { createInstallRepository } from "../repository";
import { createRegisterAdminRepository } from "./repository";
import { registerService } from "./register.service";
import type {
    RegisterData,
    RequestMeta,
    UserRole,
} from "./register.types";
import type { InstallRepository } from "../repository/repository.interface";
import type { RegisterAdminRepository } from "./repository/repository.interface";
import type { DatabaseExecutor } from "../../../db/contracts/executor.interface";

vi.mock("bcryptjs", () => ({
    default: {
        hash: vi.fn().mockImplementation(async (pw: string) => `hashed_${pw}`),
    },
}));

vi.mock("../../../db/runtime/database.runtime", () => ({
    activeDatabaseProvider: {
        type: "mysql",
        transaction: vi.fn(),
    },
}));

vi.mock("../repository", () => ({
    createInstallRepository: vi.fn(),
}));

vi.mock("./repository", () => ({
    createRegisterAdminRepository: vi.fn(),
}));

describe("registerService", () => {
    let fakeExecutor: DatabaseExecutor;
    let fakeInstallRepo: {
        getInstallationStatusForUpdate: ReturnType<typeof vi.fn>;
        updateInstallationStatus: ReturnType<typeof vi.fn>;
    };
    let fakeRegisterRepo: {
        getRoleByKey: ReturnType<typeof vi.fn>;
        getAdminByRoleId: ReturnType<typeof vi.fn>;
        register: ReturnType<typeof vi.fn>;
        registerLogger: ReturnType<typeof vi.fn>;
    };

    const validData: RegisterData = {
        userName: "  AdMiN  ",
        password: "ValidPassword123!",
        confirmPassword: "ValidPassword123!",
    };

    const meta: RequestMeta = {
        ipAddress: "127.0.0.1",
        userAgent: "Vitest Agent",
    };

    const adminRole: UserRole = {
        id: 10,
        key: "admin",
        name: "Admin",
        rights: "full",
    };

    beforeEach(() => {
        vi.clearAllMocks();

        fakeExecutor = {
            queryRows: vi.fn(),
            execute: vi.fn(),
        } as unknown as DatabaseExecutor;

        fakeInstallRepo = {
            getInstallationStatusForUpdate: vi
                .fn()
                .mockResolvedValue({ status: "migrated" }),
            updateInstallationStatus: vi.fn().mockResolvedValue(undefined),
        };

        fakeRegisterRepo = {
            getRoleByKey: vi.fn().mockResolvedValue(adminRole),
            getAdminByRoleId: vi.fn().mockResolvedValue(undefined),
            register: vi.fn().mockResolvedValue(42),
            registerLogger: vi.fn().mockResolvedValue(undefined),
        };

        vi.mocked(activeDatabaseProvider.transaction).mockImplementation(
            async (callback) => callback(fakeExecutor),
        );

        vi.mocked(createInstallRepository).mockReturnValue(
            fakeInstallRepo as unknown as InstallRepository,
        );

        vi.mocked(createRegisterAdminRepository).mockReturnValue(
            fakeRegisterRepo as unknown as RegisterAdminRepository,
        );
    });

    describe("Успешная регистрация", () => {
        it("выполняет весь сценарий регистрации администратора", async () => {
            const executionOrder: string[] = [];

            fakeInstallRepo.getInstallationStatusForUpdate.mockImplementation(
                async () => {
                    executionOrder.push("getInstallationStatusForUpdate");
                    return { status: "migrated" };
                },
            );
            fakeRegisterRepo.getRoleByKey.mockImplementation(async () => {
                executionOrder.push("getRoleByKey");
                return adminRole;
            });
            fakeRegisterRepo.getAdminByRoleId.mockImplementation(async () => {
                executionOrder.push("getAdminByRoleId");
                return undefined;
            });
            fakeRegisterRepo.register.mockImplementation(async () => {
                executionOrder.push("register");
                return 42;
            });
            fakeRegisterRepo.registerLogger.mockImplementation(async () => {
                executionOrder.push("registerLogger");
            });
            fakeInstallRepo.updateInstallationStatus.mockImplementation(
                async () => {
                    executionOrder.push("updateInstallationStatus");
                },
            );

            const response = await registerService(validData, meta);

            // 1. Вызывается activeDatabaseProvider.transaction
            expect(activeDatabaseProvider.transaction).toHaveBeenCalledTimes(1);

            // 2. Обе фабрики получают один и тот же транзакционный executor
            expect(createInstallRepository).toHaveBeenCalledWith(
                activeDatabaseProvider.type,
                fakeExecutor,
            );
            expect(createRegisterAdminRepository).toHaveBeenCalledWith(
                activeDatabaseProvider.type,
                fakeExecutor,
            );

            // 3. Порядок операций:
            // сначала статус -> роль -> проверка существующего админа -> регистрация -> логгер -> статус ready
            expect(executionOrder).toEqual([
                "getInstallationStatusForUpdate",
                "getRoleByKey",
                "getAdminByRoleId",
                "register",
                "registerLogger",
                "updateInstallationStatus",
            ]);

            // 4. Поиск именно роли 'admin'
            expect(fakeRegisterRepo.getRoleByKey).toHaveBeenCalledWith("admin");

            // 5. Проверка админа по roleId найденной роли
            expect(fakeRegisterRepo.getAdminByRoleId).toHaveBeenCalledWith(adminRole.id);

            // 6. UserName нормализуется: "  AdMiN  " -> "admin"
            expect(fakeRegisterRepo.register).toHaveBeenCalledWith(
                adminRole.id,
                "admin",
                "hashed_ValidPassword123!",
            );

            // 7. Создаётся запись в журнале с userId = 42
            expect(fakeRegisterRepo.registerLogger).toHaveBeenCalledWith(meta, 42);

            // 8. Статус установки обновляется на 'ready'
            expect(fakeInstallRepo.updateInstallationStatus).toHaveBeenCalledWith("ready");

            // 9. Возвращается путь страницы входа
            expect(response).toEqual({ redirectedTo: PagePaths.login });
        });
    });

    describe("Неправильный статус установки", () => {
        it.each([
            ["new", { status: "new" }],
            ["ready", { status: "ready" }],
            ["undefined", undefined],
        ])(
            "если статус '%s' (не migrated) → выбрасывается 409 Conflict и ничего не создаётся",
            async (_, statusValue) => {
                fakeInstallRepo.getInstallationStatusForUpdate.mockResolvedValueOnce(
                    statusValue,
                );

                await expect(registerService(validData, meta)).rejects.toMatchObject({
                    status: 409,
                });

                expect(fakeRegisterRepo.getRoleByKey).not.toHaveBeenCalled();
                expect(fakeRegisterRepo.getAdminByRoleId).not.toHaveBeenCalled();
                expect(fakeRegisterRepo.register).not.toHaveBeenCalled();
                expect(fakeRegisterRepo.registerLogger).not.toHaveBeenCalled();
                expect(fakeInstallRepo.updateInstallationStatus).not.toHaveBeenCalled();
            },
        );
    });

    describe("Роль администратора отсутствует", () => {
        it("выбрасывается INSTALL_ADMIN_ROLE_NOT_FOUND, пользователь и лог не создаются, статус не меняется", async () => {
            fakeRegisterRepo.getRoleByKey.mockResolvedValueOnce(undefined);

            await expect(registerService(validData, meta)).rejects.toMatchObject({
                status: 404,
                code: ERROR_CODES.INSTALL_ADMIN_ROLE_NOT_FOUND,
            });

            expect(fakeRegisterRepo.getAdminByRoleId).not.toHaveBeenCalled();
            expect(fakeRegisterRepo.register).not.toHaveBeenCalled();
            expect(fakeRegisterRepo.registerLogger).not.toHaveBeenCalled();
            expect(fakeInstallRepo.updateInstallationStatus).not.toHaveBeenCalled();
        });
    });

    describe("Администратор уже существует", () => {
        it("выбрасывается INSTALL_ADMIN_ALREADY_CREATED, второй пользователь не создаётся, статус не меняется", async () => {
            fakeRegisterRepo.getAdminByRoleId.mockResolvedValueOnce({
                id: 1,
                username: "existing_admin",
            });

            await expect(registerService(validData, meta)).rejects.toMatchObject({
                status: 409,
                code: ERROR_CODES.INSTALL_ADMIN_ALREADY_CREATED,
            });

            expect(fakeRegisterRepo.register).not.toHaveBeenCalled();
            expect(fakeRegisterRepo.registerLogger).not.toHaveBeenCalled();
            expect(fakeInstallRepo.updateInstallationStatus).not.toHaveBeenCalled();
        });
    });

    describe("Ошибка создания пользователя", () => {
        it("если register() выбрасывает ошибку, она выходит наружу, логгер не вызывается, статус не меняется", async () => {
            const registerError = new Error("Database insert failed");
            fakeRegisterRepo.register.mockRejectedValueOnce(registerError);

            await expect(registerService(validData, meta)).rejects.toThrow(
                registerError,
            );

            expect(fakeRegisterRepo.registerLogger).not.toHaveBeenCalled();
            expect(fakeInstallRepo.updateInstallationStatus).not.toHaveBeenCalled();
        });
    });

    describe("Ошибка записи журнала", () => {
        it("если registerLogger() выбрасывает ошибку, она выходит наружу, статус не меняется", async () => {
            const loggerError = new Error("Auth log insert failed");
            fakeRegisterRepo.registerLogger.mockRejectedValueOnce(loggerError);

            await expect(registerService(validData, meta)).rejects.toThrow(
                loggerError,
            );

            expect(fakeInstallRepo.updateInstallationStatus).not.toHaveBeenCalled();
        });
    });
});
