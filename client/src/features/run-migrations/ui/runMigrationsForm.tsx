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

    const runNextStep = async (url: string, index: number, currentSteps: string[]): Promise<void> => {
        console.log('index :', index);

        setCurrentStepIndex(index);
        setIsProcessing(true);

        const response = await installDatabase.applyMigrationsStep(url);

        if (response.success) {
            if (!response.data) {
                throw new Error('Нет данных о следующем шаге миграции');
            }
            const currentStepName = currentSteps[index];
            console.log('Выполнен шаг:', currentStepName);

            setExecutedSteps((prev) => [...prev, currentStepName]);
            toast.success(`Миграция ${url} выполнена`);

            if (response.data.nextStepUrl) {
                await runNextStep(response.data.nextStepUrl, index + 1, currentSteps);
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
                const response = await installDatabase.getMigrationsSteps();

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
                error: (err) => {
                    throw new Error(err.message || 'Ошибка при получении шагов миграции');
                }
            }).unwrap();

            if (data.steps.length === 0) {
                toast.success('Все миграции уже выполнены');
                setIsFinished(true);
            } else {
                setSteps(data.steps);
                await runNextStep(data.nextStepUrl, 0, data.steps);
            }

            await refreshBootstrap();

        } catch (error) {
            // Тост уже автоматически показал ошибку
            setCurrentStepIndex(-1);
            setIsProcessing(false);
            setSteps([]);
            setExecutedSteps([]);
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