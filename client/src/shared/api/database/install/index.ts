import { apiClient, type UnifiedResponse } from '../../apiClient';
import { type InstallDatabaseFormValues } from '../../../../features/install-database/model/installDatabase.schema';
import {
    type ApplyNextMigrationRequest,
    type ApplyNextMigrationResponse,
    type DbCheckResponse,
    type MigrationPlanResponse,
} from './install.types';

export const installDatabase = {
    checkTheConnection(data: InstallDatabaseFormValues) {
        return apiClient<UnifiedResponse<DbCheckResponse>>('/install/check-connection', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    getMigrationPlan() {
        return apiClient<UnifiedResponse<MigrationPlanResponse>>('/install/migrations/plan', {
            method: 'GET'
        })
    },

    applyNextMigration(expectedVersion: ApplyNextMigrationRequest['expectedVersion']) {
        return apiClient<UnifiedResponse<ApplyNextMigrationResponse>>('/install/migrations/apply-next', {
            method: 'POST',
            body: JSON.stringify({ expectedVersion })
        })
    }
}