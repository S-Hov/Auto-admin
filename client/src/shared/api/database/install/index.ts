import { apiClient, type UnifiedResponse } from '../../apiClient';
import { type InstallDatabaseFormValues } from '../../../../features/install-database/model/installDatabase.schema';
import {
    type ApplyNextMigrationRequest,
    type ApplyNextMigrationResponse,
    type DbCheckResponse,
    type MigrationPlanResponse,
} from './install.types';
import { HTTP_HEADERS } from '../../../../constants/headers';
import { STORAGE_KEYS } from '../../../../constants/storage';

export const installDatabase = {
    checkTheConnection(data: InstallDatabaseFormValues, token: string) {
        return apiClient<UnifiedResponse<DbCheckResponse>>('/install/check-connection', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: token
            }
        })
    },

    getMigrationPlan() {
        return apiClient<UnifiedResponse<MigrationPlanResponse>>('/install/migrations/plan', {
            method: 'GET',
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        })
    },

    applyNextMigration(expectedVersion: ApplyNextMigrationRequest['expectedVersion']) {
        return apiClient<UnifiedResponse<ApplyNextMigrationResponse>>('/install/migrations/apply-next', {
            method: 'POST',
            body: JSON.stringify({ expectedVersion }),
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        })
    }
}