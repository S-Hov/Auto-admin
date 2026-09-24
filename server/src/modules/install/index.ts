import { installRepository } from "./repository";

export type { InstallationStatusValue } from "./install.types";

export const readInstallationStatus = () => {
    return installRepository.getInstallationStatus();
};

export const markMigrationsCompleted = () => {
    return installRepository.markMigrationsCompleted();
};
