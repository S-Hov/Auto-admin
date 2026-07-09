import CardForm from "../../../shared/form/CardForm/CardForm";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../../../shared/ui/Button/Button";
import { installDatabase } from "../../../shared/api/database/install";
import type { ApiError } from "../../../shared/api/apiClient";
import { useState } from "react";

import './runMigrationsForm.css'

const RunMigrationsForm = () => {
    const { handleSubmit, formState: { isSubmitting }, } = useForm();
    const [steps, setSteps] = useState<string[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
    const [executedSteps, setExecutedSteps] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    const runNexStep = async (url: string, index: number) => {
        try {
            setCurrentStepIndex(index);
            const response = await installDatabase.applyMigrationsStep(url);

            if (response.success) {
                setExecutedSteps((prev) => [...prev, steps[index]]);
                if (response.data?.nextStepUrl) {
                    await runNexStep(response.data.nextStepUrl, index + 1);
                }
                else {
                    setIsProcessing(false);
                    toast.success('Миграции завершены');
                }
            }
            else {
                throw new Error(response.message || 'Ошибка при выполнении миграции');
            }
        }
        catch (e) {

        }
    }

    const onSubmit = () => {
        const stepsPromie = installDatabase.getMigrationsSteps()

        toast.promise(stepsPromie, {
            loading: 'получаем миграции...',

            success: (response) => {

                setSteps(response.data?.steps || []);

                if (response.success) {
                    console.log('response :', response);

                    // runNexStep(response.data?.nextStepUrl || '', 0);

                    return `${response.message}`;
                }
            },

            error: (err) => {
                const apiError = err as ApiError;
                return `Ошибка: ${apiError.message || err.message || 'Не удалось получить миграции'}`;
            }
        })
    }

    return (

        <CardForm
            headerTitle="Запуск миграций"
            headerDescription="Запустите миграции, чтобы создать служебные таблицы для Auto Admin"
            formID="dbForm"
            onSubmit={handleSubmit(onSubmit)}
            className={`${isSubmitting ? 'isSubmitting' : ''}`}
        >
            {steps.length === 0 && (
                <Button
                    type="submit"
                    variant="primary"
                    className="w-100__percent"
                >
                    Запустить миграции
                </Button>
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
                                    {isCurrent && isProcessing && <span className="spinner-small">Выполняется...</span>}
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