import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { installDatabaseSchema, type InstallDatabaseFormValues } from '../model/installDatabase.schema';
import { ControlledInput } from '../../../shared/form/ControlledInput/ControlledInput';

import './InstallDatabaseForm.css';

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
        console.log(data);
    };

    return (
        <div className="card">
            <div className="accent-line"></div>

            <div className="card-title">Подключение к БД</div>
            <div className="card-subtitle">Заполните параметры доступа</div>
            
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

                <button type="submit" className="check-button" disabled={isSubmitting}>
                    {isSubmitting ? 'Проверяем...' : 'Проверить подключение'}
                </button>
            </form>
        </div>
    );
};

export default InstallDatabaseForm;
