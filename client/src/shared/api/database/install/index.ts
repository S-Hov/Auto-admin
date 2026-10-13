import { apiClient } from '../../apiClient';
import type {
    ApplyNextMigrationRequest,
    DbConnectionPayload,
    MarkMigrationAppliedRequest,
    RetryMigrationRequest,
} from './install.types';
import { dbCheckResponseSchema, migrationPlanResponseSchema, applyNextMigrationResponseSchema, retryMigrationResponseSchema, markMigrationAppliedResponseSchema, recoveryMigrationResponseSchema } from './install.schema';
import { HTTP_HEADERS } from '../../../../constants/headers';
import { STORAGE_KEYS } from '../../../../constants/storage';

export const installDatabase = {
    checkTheConnection(data: DbConnectionPayload, token: string) {
        return apiClient('/install/check-connection', dbCheckResponseSchema, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: token
            }
        })
    },

    getMigrationPlan() {
        return apiClient('/install/migrations/plan', migrationPlanResponseSchema, {
            method: 'GET',
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        })
    },

    applyNextMigration(expectedVersion: ApplyNextMigrationRequest['expectedVersion']) {
        return apiClient('/install/migrations/apply-next', applyNextMigrationResponseSchema, {
            method: 'POST',
            body: JSON.stringify({ expectedVersion }),
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        })
    },

    retryMigration(data: RetryMigrationRequest) {
        return apiClient('/install/migrations/retry', retryMigrationResponseSchema, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        })
    },

    markMigrationApplied(data: MarkMigrationAppliedRequest) {
        return apiClient('/install/migrations/mark-applied', markMigrationAppliedResponseSchema, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        })
    },

    getRecoveryInfo() {
        return apiClient('/install/migrations/recovery', recoveryMigrationResponseSchema, {
            method: 'GET',
            headers: {
                [HTTP_HEADERS.INSTALL_TOKEN]: sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) || ''
            }
        });
    },
}
