import { getInstallationStatus as getInstallationStatusRow } from './install.repository';
import type { InstallationStatusValue } from './install.types';

export const readInstallationStatus =
    async (): Promise<InstallationStatusValue | undefined> => {
        const row = await getInstallationStatusRow();

        return row?.status;
    };