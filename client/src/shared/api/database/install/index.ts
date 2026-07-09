import { apiClient, type UnifiedResponse } from '../../apiClient';
import { type InstallDatabaseFormValues } from '../../../../features/install-database/model/installDatabase.schema';
import { 
    type ApplyMigrationsStepResponse, 
    type DbCheckResponse, 
    type MigrationsStepsResponse 
} from './install.types';

export const installDatabase = {
    checkTheConnection(data: InstallDatabaseFormValues) {
        return apiClient<UnifiedResponse<DbCheckResponse>>('/install/check-connection', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    getMigrationsSteps() {
        return apiClient<UnifiedResponse<MigrationsStepsResponse>>('/install/migrations/getMigrationsSteps', {
            method: 'GET'
        })
    },

    applyMigrationsStep(url: string) {
        return apiClient<UnifiedResponse<ApplyMigrationsStepResponse>>(`/install/migrations/steps/${url}`, {
            method: 'POST',
            body: JSON.stringify({ url })
        })
    },
}