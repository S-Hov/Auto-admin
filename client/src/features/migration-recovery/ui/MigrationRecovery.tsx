import { useEffect, useState } from "react";
import CardForm from "../../../shared/form/CardForm/CardForm";
import { Button } from "../../../shared/ui/Button/Button";
import { installDatabase } from "../../../shared/api/database/install";
import { toast } from "sonner";
import { apiMessage } from "../../../shared/i18n/api-message";
import type { RecoveryMigrationResponse } from "../../../shared/api/database/install/install.types";

const recoveryInfoItems = [
    { name: "Версия", key: "version" },
    { name: "Имя", key: "name" },
    { name: "Хэш", key: "checksum" },
    { name: "Статус", key: "status" }
]

const MigrationRecovery = () => {
    const [migrationInfo, setMigrationInfo] = useState<RecoveryMigrationResponse | null>(null);

    useEffect(() => {
        try {
            const result = installDatabase.getRecoveryInfo();
            toast.promise(result, {
                loading: 'Загрузка информации о миграциях...',
                success: (response) => {
                    setMigrationInfo(response.data);

                    return apiMessage(response);
                },
                error: (err) => apiMessage(err),
            }).unwrap();
        }
        catch {
            // Ошибка уже отображена через toast
        }
    }, [])


    return (
        <CardForm
            headerTitle="Восстановление миграций"
            headerDescription="Выберите способ восстановления миграций"
        >
            <div className="recovery-info">
                {recoveryInfoItems.map((item) => {
                    return (
                        <div className="grid grid-1-column recovery-info__item">
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
                    disabled={!migrationInfo}
                    variant="primary"
                >
                    Повторить выполнение
                </Button>
                <Button
                    disabled={!migrationInfo}
                    variant="danger"
                >
                    Пометить как выполненную вручную
                </Button>
            </div>
        </CardForm>
    )
}

export default MigrationRecovery;