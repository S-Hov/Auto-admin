import { useEffect, useState } from "react";
import CardForm from "../../../shared/form/CardForm/CardForm";
import { Button } from "../../../shared/ui/Button/Button";
import { installDatabase } from "../../../shared/api/database/install";
import { toast } from "sonner";
import { apiMessage } from "../../../shared/i18n/api-message";
import type { RecoveryMigrationResponse } from "../../../shared/api/database/install/install.types";
import { useBootstrap } from "../../../app/providers/bootstrap/BootstrapContext";

interface RecoveryInfoItem {
    name: string;
    key: keyof RecoveryMigrationResponse;
}

const recoveryInfoItems: RecoveryInfoItem[] = [
    { name: "Версия", key: "version" },
    { name: "Имя", key: "name" },
    { name: "Хэш", key: "checksum" },
    { name: "Статус", key: "status" }
]

const MigrationRecovery = () => {
    const [migrationInfo, setMigrationInfo] = useState<RecoveryMigrationResponse | null>(null);
    const [isRetrying, setIsRetrying] = useState<boolean>(false);
    const [isMarking, setIsMarking] = useState<boolean>(false);

    const { refreshBootstrap } = useBootstrap();

    useEffect(() => {
        try {
            const result = installDatabase.getRecoveryInfo();
            toast.promise(result, {
                loading: 'Загрузка информации о миграциях...',
                success: (response) => {
                    setMigrationInfo(response.data ?? null);

                    return apiMessage(response);
                },
                error: (err) => apiMessage(err),
            }).unwrap();
        }
        catch {
            // Ошибка уже отображена через toast
        }
    }, [])

    const handleRetry = async () => {
        if (!migrationInfo || isMarking || isRetrying) return;

        setIsRetrying(true);
        try {
            const result = installDatabase.retryMigration({ expectedVersion: migrationInfo.version, checksum: migrationInfo.checksum });

            toast.promise(result, {
                loading: 'Повторное выполнение миграции...',
                success: (response) => apiMessage(response),
                error: (err) => apiMessage(err),
            }).unwrap();
            await refreshBootstrap();
        }
        catch {
            // Ошибка уже отображена через toast
        }
        finally {
            setIsRetrying(false);
        }
    }

    const handleMarkApplied = async () => {
        if (!migrationInfo || isMarking || isRetrying) return;

        setIsMarking(true);
        try {
            const result = installDatabase.markMigrationApplied({ expectedVersion: migrationInfo.version, checksum: migrationInfo.checksum });

            toast.promise(result, {
                loading: 'Пометка миграции как выполненной...',
                success: (response) => apiMessage(response),
                error: (err) => apiMessage(err),
            }).unwrap();
            await refreshBootstrap();
        }
        catch {
            // Ошибка уже отображена через toast
        }
        finally {
            setIsMarking(false);
        }
    }

    return (
        <CardForm
            headerTitle="Восстановление миграций"
            headerDescription="Выберите способ восстановления миграций"
        >
            <div className="recovery-info">
                {recoveryInfoItems.map((item) => {
                    return (
                        <div key={item.key} className="grid grid-1-column recovery-info__item">
                            <span>{item.name}: </span>
                            <strong>
                                {migrationInfo?.[item.key] ?? (
                                    <div className="recovery-info__item-loader"></div>
                                )}
                            </strong>
                        </div>
                    )
                })}
            </div>
            <div className="grid actions grid-2-columns">
                <Button
                    disabled={!migrationInfo || isRetrying || isMarking}
                    isLoading={isRetrying}
                    onClick={handleRetry}
                    variant="primary"
                >
                    Повторить выполнение
                </Button>
                <Button
                    disabled={!migrationInfo || isRetrying || isMarking}
                    isLoading={isMarking}
                    onClick={handleMarkApplied}
                    variant="danger"
                >
                    Пометить как выполненную вручную
                </Button>
            </div>
        </CardForm>
    )
}

export default MigrationRecovery;