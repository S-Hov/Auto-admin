import CardForm from "../../../shared/form/CardForm/CardForm";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../../../shared/ui/Button/Button";
import { installDatabase } from "../../../shared/api/database/install";
import { useState } from "react";

import './runMigrationsForm.css'
import Loader from "../../../shared/ui/Loader/Loader";
import { useBootstrap } from "../../../app/providers/bootstrap/BootstrapContext";
import type { MigrationStepResponse } from "../../../shared/api/database/install/install.types";
import { apiMessage } from "../../../shared/i18n/api-message";

const RunMigrationsForm = () => {
    const { handleSubmit, formState: { isSubmitting }, } = useForm();
    const [steps, setSteps] = useState<MigrationStepResponse[]>([]);
    const [isFinished, setIsFinished] = useState<boolean>(false);
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
    const [executedSteps, setExecutedSteps] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const { refreshBootstrap } = useBootstrap();

    const runNextStep = async (expectedVersion: string, index: number): Promise<void> => {
        console.log('index :', index);

        setCurrentStepIndex(index);
        setIsProcessing(true);

        const response = await installDatabase.applyNextMigration(expectedVersion);

        if (response.success) {
            if (!response.data) {
                throw new Error('Нет данных о следующем шаге миграции');
            }

            const data = response.data;   

            if (data.applied === null) {
                throw new Error('Миграция не была выполнена');
            }

            if (data.applied.version !== expectedVersion) {
                throw new Error(`Версия миграции ${data.applied.version} не совпадает с ожидаемой ${expectedVersion}`);
            }

            const currentStep = data.applied;

            setExecutedSteps((prev) => [...prev, currentStep.version]);
            toast.success(`Миграция ${currentStep.version} выполнена`);

            if (typeof data.nextVersion === 'string' && !data.isComplete) {
                await runNextStep(data.nextVersion, index + 1);
            } else if (data.isComplete && data.nextVersion === null) {
                setIsProcessing(false);
                setCurrentStepIndex(-1);
                setIsFinished(true);
                toast.success('Миграции завершены');
            } else {
                throw new Error('Некорректный ответ от сервера');
            }
        } else {
            throw new Error(apiMessage(response) || 'Ошибка при выполнении миграции');
        }

    };

    const onSubmit = async () => {
        try {
            const migrationDataPromise = (async () => {
                const response = await installDatabase.getMigrationPlan();

                if (!response.success) {
                    throw new Error(apiMessage(response) || 'Ошибка при получении шагов миграции');
                }
                if (!response.data) {
                    throw new Error('Нет данных о шагах миграции');
                }

                return response.data;
            })();

            const data = await toast.promise(migrationDataPromise, {
                loading: 'Получаем миграции...',
                success: 'Миграции успешно получены', 
            }).unwrap();

            if (data.pending.length === 0) {
                toast.success('Все миграции уже выполнены');
                setIsFinished(true);
            } else {
                setSteps(data.pending);
                if (!data.nextVersion) {
                    throw new Error('Нет следующей версии миграции');
                }
                await runNextStep(data.nextVersion, 0);
            }

            await refreshBootstrap();

        } catch (error) {
            // Тост уже автоматически показал ошибку
            setCurrentStepIndex(-1);
            setIsProcessing(false);
            setSteps([]);
            setExecutedSteps([]);
            toast.error(apiMessage(error));
        }
    };


    return (

        <CardForm
            headerTitle="Запуск миграций"
            headerDescription="Запустите миграции, чтобы создать служебные таблицы для Auto Admin"
            formID="dbForm"
            onSubmit={handleSubmit(onSubmit)}
            className={`${isSubmitting ? 'isSubmitting' : ''}`}
        >
            {steps.length === 0 && !isFinished && (
                <Button
                    type="submit"
                    variant="primary"
                    className="w-100__percent"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                >
                    Запустить миграции
                </Button>
            )}

            {isFinished && (
                <div className="migrations-finished-block">
                    <span>Все миграции выполнены</span>
                </div>
            )}

            {steps.length > 0 && !isFinished && (
                <div className="migrations-list">
                    {steps.map((step, index) => {
                        const isExecuted = executedSteps.includes(step.version);
                        const isCurrent = currentStepIndex === index;

                        return (
                            <div
                                key={step.version}
                                className={`step-item ${isExecuted ? 'executed' : ''} ${isCurrent ? 'current' : ''}`}
                            >
                                <span style={{ fontWeight: isCurrent ? '600' : 'normal' }}>
                                    {index + 1}. {step.name}
                                </span>

                                <span className="step-status">
                                    {isExecuted && <strong>✓ Готово</strong>}
                                    {isCurrent && isProcessing && <Loader />}
                                    {!isExecuted && !isCurrent && <span className="in-the-queue">В очереди</span>}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

        </CardForm>
    );
};

export default RunMigrationsForm;