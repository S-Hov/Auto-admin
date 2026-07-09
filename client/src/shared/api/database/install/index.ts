import { apiClient, type UnifiedResponse } from '../../apiClient';
import { type InstallDatabaseFormValues } from '../../../../features/install-database/model/installDatabase.schema';
import { type DbCheckResponse, type MigrationStepsResponse } from './install.types';

export const installDatabase = {
    checkTheConnection(data: InstallDatabaseFormValues) {
        return apiClient<UnifiedResponse<DbCheckResponse>>('/install/check-connection', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    getMigrationsSteps() {
        return apiClient<UnifiedResponse<MigrationStepsResponse>>('/install/migrations/getMigrationsSteps', {
            method: 'GET'
        })
    }
}