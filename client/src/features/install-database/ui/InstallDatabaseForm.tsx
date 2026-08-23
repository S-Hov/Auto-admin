import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { installDatabaseSchema, type InstallDatabaseFormValues } from '../model/installDatabase.schema';
import { ControlledInput } from '../../../shared/form/ControlledInput/ControlledInput';
import { Button } from '../../../shared/ui/Button/Button';
import { installDatabase } from '../../../shared/api/database/install';
import { type ApiError } from '../../../shared/api/apiClient';

import CardForm from '../../../shared/form/CardForm/CardForm';
import { useBootstrap } from '../../../app/providers/bootstrap/BootstrapContext';
import { STORAGE_KEYS } from '../../../constants/storage';

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
    { name: 'install_token', label: 'Токен установки', type: 'text', placeholder: '********-****-****-****-************' },
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
            install_token: '',
        },
    });

    const { refreshBootstrap } = useBootstrap();

    const onSubmit = async (data: InstallDatabaseFormValues) => {
        try {
            const installToken = data.install_token;
            delete data.install_token;
            const connectionPromise = installDatabase.checkTheConnection(data, installToken);
    
            await toast.promise(connectionPromise, {
                loading: 'Проверяем подключение к MySQL...',
    
                success:(response) => {
    
                    if (response.success) {
                        sessionStorage.setItem(STORAGE_KEYS.INSTALL_TOKEN, installToken);
                        return `${response.message}`;
                    }
                    throw new Error('Сервер отклонил параметры подключения');
                },
    
                error: (err) => {
                    const apiError = err as ApiError;
                    return `Ошибка: ${apiError.message || err.message || 'Не удалось связаться с сервером'}`;
                },
    
            }).unwrap();
    
            await refreshBootstrap();
        }
        catch {
            // Ошибка уже отображена через toast
        }
    };

    return (
        <CardForm
            headerTitle="Подключение к БД"
            headerDescription="Заполните данные ниже"
            formID="dbForm"
            onSubmit={handleSubmit(onSubmit)}
        >
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

            <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="check-button w-100__percent"
                disabled={isSubmitting}
            >
                Проверить подключение
            </Button>
        </CardForm>
    );
};

export default InstallDatabaseForm;
