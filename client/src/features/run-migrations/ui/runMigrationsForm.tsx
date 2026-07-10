import CardForm from "../../../shared/form/CardForm/CardForm";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../../../shared/ui/Button/Button";
import { installDatabase } from "../../../shared/api/database/install";
import type { ApiError } from "../../../shared/api/apiClient";
import { useState } from "react";

import './runMigrationsForm.css'
import Loader from "../../../shared/ui/Loader/Loader";
import { Link } from "react-router-dom";

const RunMigrationsForm = () => {
    const { handleSubmit, formState: { isSubmitting }, } = useForm();
    const [steps, setSteps] = useState<string[]>([]);
    const [isFinished, SetIsFinished] = useState<boolean>(false);
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
    const [executedSteps, setExecutedSteps] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    const runNexStep = async (url: string, index: number, currentSteps: string[]) => {
        console.log('index :', index);
        try {
            setCurrentStepIndex(index);
            setIsProcessing(true);

            const response = await installDatabase.applyMigrationsStep(url);

            if (response.success) {
                const currentStepName = currentSteps[index];
                console.log('Выполнен шаг:', currentStepName);

                setExecutedSteps((prev) => [...prev, currentStepName]);
                toast.success(`Миграция ${url} выполнена`);

                if (response.data?.nextStepUrl) {
                    await runNexStep(response.data.nextStepUrl, index + 1, currentSteps);
                } else {
                    setIsProcessing(false);
                    setCurrentStepIndex(-1);
                    SetIsFinished(true);
                    toast.success('Миграции завершены');
                }
            } else {
                throw new Error(response.message || 'Ошибка при выполнении миграции');
            }
        } catch (e) {
            setIsProcessing(false);
            const err = e as Error;
            toast.error(`Ошибка на шаге ${index + 1}: ${err.message || 'Неизвестная ошибка'}`);
        }
    };

    const onSubmit = () => {
        const stepsPromie = installDatabase.getMigrationsSteps();

        toast.promise(stepsPromie, {
            loading: 'получаем миграции...',
            success: (response) => {
                const fetchedSteps = response.data?.steps || [];
                setSteps(fetchedSteps);

                if (response.success) {
                    console.log('response :', response);

                    if (fetchedSteps.length === 0 && response.data?.nextStepUrl === '') {
                        SetIsFinished(true);
                        return 'Все миграции применены';
                    }

                    runNexStep(response.data?.nextStepUrl || '', 0, fetchedSteps);

                    return `${response.message}`;
                }
                return 'Запрос выполнен';
            },
            error: (err) => {
                const apiError = err as ApiError;
                return `Ошибка: ${apiError.message || err.message || 'Не удалось получить миграции'}`;
            }
        });
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
                <div>
                    <span>Все миграции выполнены</span>
                    <Link to={`/auu`}> asd</Link>
                </div>
            )}

            {steps.length > 0 && (
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