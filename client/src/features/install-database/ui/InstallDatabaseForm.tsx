import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { installDatabaseSchema, type InstallDatabaseFormValues } from '../model/installDatabase.schema';
import { ControlledInput } from '../../../shared/form/ControlledInput/ControlledInput';
import { Button } from '../../../shared/ui/Button/Button';
import { installDatabase } from '../../../shared/api/database/install';
import { type ApiError } from '../../../shared/api/apiClient';

import './InstallDatabaseForm.css';
import FormHeader from '../../../shared/form/Header/Header';

interface FieldConfig {
    name: keyof InstallDatabaseFormValues;
    label: string;
    type?: 'text' | 'number' | 'password';
    placeholder: string;
}

const SINGLE_FIELDS: FieldConfig[] = [
    { name: 'database', label: 'База данных', placeholder: 'my_database' },
    { name: 'user', label: 'Пользователь', placeholder: 'admin' },
    { name: 'password', label: 'Пароль', type: 'password', placeholder: '••••••••' },
];

const InstallDatabaseForm = () => {
    const {
        control,
        handleSubmit,
        formState: { isSubmitting },
    } = useForm<InstallDatabaseFormValues>({
        resolver: zodResolver(installDatabaseSchema),
        defaultValues: {
            host: 'localhost',
            port: 3306,
            database: 'auto_admin_test',
            user: 'root',
            password: '',
        },
    });

    const onSubmit = async (data: InstallDatabaseFormValues) => {

        const connectionPromise = installDatabase.checkTheConnection(data);

        toast.promise(connectionPromise, {
            loading: 'Проверяем подключение к MySQL...',

            success: (response) => {
                console.log('response', response);
                if (response.success) {
                    return `${response.message}`;
                }
                throw new Error('Сервер отклонил параметры подключения');
            },

            error: (err) => {
                const apiError = err as ApiError;
                return `Ошибка: ${apiError.message || err.message || 'Не удалось связаться с сервером'}`;
            },

        });

        try {
            await connectionPromise;
        } catch (error) {
            console.warn('Подключение завершилось с ошибкой');
        }
    };

    return (
        <div className="card form">
            <FormHeader title="Подключение к БД" description="Заполните данные ниже" />

            <form id="dbForm" onSubmit={handleSubmit(onSubmit)}>
                <div className="row-duo">
                    <ControlledInput control={control} name="host" label="Хост" placeholder="localhost" />
                    <ControlledInput control={control} name="port" label="Порт" type="number" placeholder="5432" />
                </div>

                {SINGLE_FIELDS.map((field) => (
                    <ControlledInput
                        key={field.name}
                        control={control}
                        name={field.name}
                        label={field.label}
                        type={field.type}
                        placeholder={field.placeholder}
                    />
                ))}

                <Button type="submit" variant="primary" isLoading={isSubmitting} className="check-button w-100__percent" disabled={isSubmitting}>
                    Проверить подключение
                </Button>

            </form>
        </div>
    );
};

export default InstallDatabaseForm;
