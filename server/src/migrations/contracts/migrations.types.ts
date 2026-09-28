export type RecoveryAction = 'retry' | 'mark_applied';
export type RecoveryResult = 'started' | 'succeeded' | 'failed';

export interface RecoveryAuditMeta {
    ipAddress: string | null;
    userAgent: string | null;
    requestId: string | null;
}