import { getActiveInstallRepository } from "./repository/runtime/install-repository.runtime";

export type { InstallationStatusValue } from "./install.types";

export const readInstallationStatus = () => {
    return getActiveInstallRepository().getInstallationStatus();
};

export const markMigrationsCompleted = () => {
    return getActiveInstallRepository().markMigrationsCompleted();
};
