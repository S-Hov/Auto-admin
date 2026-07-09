import CardForm from "../../../shared/form/CardForm/CardForm";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../../../shared/ui/Button/Button";
import { installDatabase } from "../../../shared/api/database/install";
import type { ApiError } from "../../../shared/api/apiClient";

const RunMigrationsForm = () => {
    const {handleSubmit, formState: { isSubmitting },} = useForm();

    const onSubmit = () => {
        const stepsPromie = installDatabase.getMigrationsSteps()

        toast.promise(stepsPromie, {
            loading: 'получаем миграции...',

            success: (response) => {
                if (response.success){
                console.log('response :', response);

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
            <Button
                type="submit"
                variant="primary"
                className="w-100__percent"
            >
                Запустить миграции
            </Button>


        </CardForm>
    );
};

export default RunMigrationsForm;