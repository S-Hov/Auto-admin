import { activeInstallRepository } from "./repository/runtime/install-repository.runtime";

export type { InstallationStatusValue } from "./install.types";

export const readInstallationStatus = () => {
    return activeInstallRepository.getInstallationStatus();
};

export const markMigrationsCompleted = () => {
    return activeInstallRepository.markMigrationsCompleted();
};
