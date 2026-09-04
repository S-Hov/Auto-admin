import { useEffect, useState } from "react";
import CardForm from "../../../shared/form/CardForm/CardForm";
import { Button } from "../../../shared/ui/Button/Button";
import { installDatabase } from "../../../shared/api/database/install";
import { toast } from "sonner";
import { apiMessage } from "../../../shared/i18n/api-message";
import type { RecoveryMigrationResponse } from "../../../shared/api/database/install/install.types";
import { useBootstrap } from "../../../app/providers/bootstrap/BootstrapContext";
import { STORAGE_KEYS } from "../../../constants/storage";
import { ControlledInput } from "../../../shared/form/ControlledInput/ControlledInput";
import { useForm } from "react-hook-form";
import { MigrationRecoverySchema, type MigrationRecoveryFormValues } from "../model/MigrationRecovery.schema";
import { zodResolver } from "@hookform/resolvers/zod";

import './MigrationRecovery.css';
import '../../../app/styles/loaders.css';

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
    const {
        control,
        handleSubmit,
        formState: { isSubmitting },
    } = useForm<MigrationRecoveryFormValues>({
        resolver: zodResolver(MigrationRecoverySchema),
        defaultValues: {
            install_token: '',
        },
    });
    const [migrationInfo, setMigrationInfo] = useState<RecoveryMigrationResponse | null>(null);
    const [isRetrying, setIsRetrying] = useState<boolean>(false);
    const [isMarking, setIsMarking] = useState<boolean>(false);
    const [installToken, setInstallToken] = useState<string | null>(sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) ?? null);

    const { refreshBootstrap } = useBootstrap();

    const loadRecoveryInfo = async () => {
        try {
            await toast.promise(installDatabase.getRecoveryInfo(), {
                loading: 'Загрузка данных...',
                success: (response) => {
                    setMigrationInfo(response.data ?? null);
                    setInstallToken(sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN) ?? null);
                    return apiMessage(response);
                },
                error: (err) => apiMessage(err),
            }).unwrap();
        } catch {
            // Ошибка уже отображена через toast
        }
    };

    useEffect(() => {
        if (installToken) {
            void loadRecoveryInfo();
        }
    }, [installToken]);

    const handleRetry = async () => {
        if (!migrationInfo || isMarking || isRetrying) return;

        setIsRetrying(true);
        try {
            const result = installDatabase.retryMigration({ expectedVersion: migrationInfo.version, checksum: migrationInfo.checksum });

            await toast.promise(result, {
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

            await toast.promise(result, {
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


    const onSubmit = async (data: MigrationRecoveryFormValues) => {
        sessionStorage.setItem(STORAGE_KEYS.INSTALL_TOKEN, data.install_token);
        setInstallToken(data.install_token);
        void loadRecoveryInfo();
    }

    return (
        <CardForm
            headerTitle="Восстановление миграций"
            headerDescription="Выберите способ восстановления миграций"
            className="recovery-form"
            onSubmit={handleSubmit(onSubmit)}
        >
            {installToken ? (
                <div className="recovery-info">
                    {recoveryInfoItems.map((item) => {
                        return (
                            <div key={item.key} className="flex recovery-info__item">
                                <span>{item.name}: </span>
                                <strong className={`${item.key}__${migrationInfo?.[item.key] ?? ''}`} title={migrationInfo?.[item.key] ?? ''}>
                                    {migrationInfo?.[item.key] ?? (
                                        <div className="recovery-info__item-loader loader__loading"></div>
                                    )}
                                </strong>
                            </div>
                        )
                    })}
                </div>
            ) : ''}

            <div className={`grid actions grid-${installToken ? 2 : 1}-columns`}>
                {installToken ?
                    (
                        <>
                            <Button
                                disabled={!migrationInfo || isRetrying || isMarking}
                                isLoading={isRetrying}
                                type="button"
                                onClick={handleRetry}
                                variant="primary"
                            >
                                Повторить выполнение
                            </Button>
                            <Button
                                disabled={!migrationInfo || isRetrying || isMarking}
                                isLoading={isMarking}
                                type="button"
                                onClick={handleMarkApplied}
                                variant="danger"
                            >
                                Пометить как выполненную вручную
                            </Button>
                        </>
                    )
                    : (
                        <>
                            <ControlledInput
                                control={control}
                                name="install_token"
                                label="Токен установки"
                                type="password"
                                placeholder="********-****-****-****-************"
                            />
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Установить токен
                            </Button>
                        </>
                    )
                }
            </div>
        </CardForm>
    )
}

export default MigrationRecovery;