import type {
    InstallationStatus,
    InstallationStatusValue,
} from "../install.types";

export interface InstallRepository {
    updateInstallationStatus(newStatus: InstallationStatusValue): Promise<void>;

    getInstallationStatusForUpdate(): Promise<InstallationStatus | undefined>;

    getInstallationStatus(): Promise<InstallationStatusValue | undefined>;

    markMigrationsCompleted(): Promise<void>;
}
