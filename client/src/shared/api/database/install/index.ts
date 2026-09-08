import { apiClient } from '../../apiClient';
import type {
    ApplyNextMigrationRequest,
    ApplyNextMigrationResponse,
    DbCheckResponse,
    DbConnectionPayload,
    MarkMigrationAppliedRequest,
    MarkMigrationAppliedResponse,
    MigrationPlanResponse,
    RecoveryMigrationResponse,
    RetryMigrationRequest,
    RetryMigrationResponse,
} from './install.types';
import { HTTP_HEADERS } from '../../../../constants/headers';
import { STORAGE_KEYS } from '../../../../constants/storage';

export const installDatabase = {
    checkTheConnection(data: DbConnectionPayload, token: string) {
        return apiClient<DbCheckResponse>('/install/check-connection', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: token
            }
        })
    },

    getMigrationPlan() {
        return apiClient<MigrationPlanResponse>('/install/migrations/plan', {
            method: 'GET',
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        })
    },

    applyNextMigration(expectedVersion: ApplyNextMigrationRequest['expectedVersion']) {
        return apiClient<ApplyNextMigrationResponse>('/install/migrations/apply-next', {
            method: 'POST',
            body: JSON.stringify({ expectedVersion }),
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        })
    },

    retryMigration(data: RetryMigrationRequest) {
        return apiClient<RetryMigrationResponse>('/install/migrations/retry', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        })
    },

    markMigrationApplied(data: MarkMigrationAppliedRequest) {
        return apiClient<MarkMigrationAppliedResponse>('/install/migrations/mark-applied', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        })
    },

    getRecoveryInfo() {
        return apiClient<RecoveryMigrationResponse>('/install/migrations/recovery', {
            method: 'GET',
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        });
    },
}
