import CardForm from "../../../shared/form/CardForm/CardForm";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../../../shared/ui/Button/Button";
import { installDatabase } from "../../../shared/api/database/install";
import { useState } from "react";

import './runMigrationsForm.css'
import Loader from "../../../shared/ui/Loader/Loader";
import { useBootstrap } from "../../../app/providers/bootstrap/BootstrapContext";

const RunMigrationsForm = () => {
    const { handleSubmit, formState: { isSubmitting }, } = useForm();
    const [steps, setSteps] = useState<string[]>([]);
    const [isFinished, setIsFinished] = useState<boolean>(false);
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
    const [executedSteps, setExecutedSteps] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const { refreshBootstrap } = useBootstrap();

    const runNextStep = async (expectedVersion: string, index: number, currentSteps: string[]): Promise<void> => {
        console.log('index :', index);

        setCurrentStepIndex(index);
        setIsProcessing(true);

        const response = await installDatabase.applyNextMigration(expectedVersion);

        if (response.success) {
            if (!response.data) {
                throw new Error('Нет данных о следующем шаге миграции');
            }
            const currentStepName = currentSteps[index];
            console.log('Выполнен шаг:', currentStepName);

            setExecutedSteps((prev) => [...prev, currentStepName]);
            toast.success(`Миграция ${currentStepName} выполнена`);

            if (response.data.nextVersion) {
                await runNextStep(response.data.nextVersion, index + 1, currentSteps);
            } else {
                setIsProcessing(false);
                setCurrentStepIndex(-1);
                setIsFinished(true);
                toast.success('Миграции завершены');
            }
        } else {
            throw new Error(response.message || 'Ошибка при выполнении миграции');
        }
    };

    const onSubmit = async () => {
        try {
            const migrationDataPromise = (async () => {
                const response = await installDatabase.getMigrationPlan();

                if (!response.success) {
                    throw new Error(response.message || 'Ошибка при получении шагов миграции');
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
                setSteps(data.pending.map(step => step.name));
                if (!data.nextVersion) {
                    throw new Error('Нет следующей версии миграции');
                }
                await runNextStep(data.nextVersion, 0, data.pending.map(step => step.name));
            }

            await refreshBootstrap();

        } catch (error) {
            // Тост уже автоматически показал ошибку
            setCurrentStepIndex(-1);
            setIsProcessing(false);
            setSteps([]);
            setExecutedSteps([]);
            toast.error(error instanceof Error ? error.message : 'Произошла неизвестная ошибка');
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
                    {steps.map((stepName, index) => {
                        const isExecuted = executedSteps.includes(stepName);
                        const isCurrent = currentStepIndex === index;

                        return (
                            <div
                                key={stepName}
                                className={`step-item ${isExecuted ? 'executed' : ''} ${isCurrent ? 'current' : ''}`}
                            >
                                <span style={{ fontWeight: isCurrent ? '600' : 'normal' }}>
                                    {index + 1}. {stepName}
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