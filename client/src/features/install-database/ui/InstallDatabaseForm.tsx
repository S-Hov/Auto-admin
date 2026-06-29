import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { installDatabaseSchema, type InstallDatabaseFormValues } from '../model/installDatabase.schema';

import './InstallDatabaseForm.css';

const InstallDatabaseForm = () => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
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

    const onSubmit = (data: InstallDatabaseFormValues): void => {
        console.log(data);
    };

    const INPUTS = {
        host: {
            name: 'host',
            label: 'Хост',
            type: 'text' as const,
            placeholder: 'localhost',
        },
        port: {
            name: 'port',
            label: 'Порт',
            type: 'number' as const,
            placeholder: '5432',
        },
        database: {
            name: 'database',
            label: 'База данных',
            type: 'text' as const,
            placeholder: 'my_database',
        },
        user: {
            name: 'user',
            label: 'Пользователь',
            type: 'text' as const,
            placeholder: 'admin',
        },
        password: {
            name: 'password',
            label: 'Пароль',
            type: 'password' as const,
            placeholder: '••••••••',
        },
    } as const;

    return (
        <div className="card">
            <div className="accent-line"></div>

            <div className="card-title">Подключение к БД</div>
            <div className="card-subtitle">Заполните параметры доступа</div>
            <form id="dbForm" onSubmit={handleSubmit(onSubmit)}>
                <div className="row-duo">
                    <div className="field-group">
                        <label htmlFor={INPUTS.host.name}>{INPUTS.host.label}</label>
                        <input type="text" id={INPUTS.host.name} placeholder={INPUTS.host.placeholder} {...register(INPUTS.host.name)} />
                        {errors.host && <p>{errors.host.message}</p>}
                    </div>
                    <div className="field-group">
                        <label htmlFor={INPUTS.port.name}>{INPUTS.port.label}</label>
                        <input type="number" id={INPUTS.port.name} placeholder={INPUTS.port.placeholder} {...register(INPUTS.port.name, { valueAsNumber: true })} />
                        {errors.port && <p>{errors.port.message}</p>}
                    </div>
                </div>

                <div className="field-group">
                    <label htmlFor={INPUTS.database.name}>{INPUTS.database.label}</label>
                    <input type="text" id={INPUTS.database.name} placeholder={INPUTS.database.placeholder} {...register(INPUTS.database.name)} />
                    {errors.database && <p>{errors.database.message}</p>}
                </div>

                <div className="field-group">
                    <label htmlFor={INPUTS.user.name}>{INPUTS.user.label}</label>
                    <input type="text" id={INPUTS.user.name} placeholder={INPUTS.user.placeholder} {...register(INPUTS.user.name)} />
                    {errors.user && <p>{errors.user.message}</p>}
                </div>

                <div className="field-group">
                    <label htmlFor={INPUTS.password.name}>{INPUTS.password.label}</label>
                    <input type="password" id={INPUTS.password.name} placeholder={INPUTS.password.placeholder} {...register(INPUTS.password.name)} />
                    {errors.password && <p>{errors.password.message}</p>}
                </div>

                <button type="button" className="check-button" id="checkBtn">
                    <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Проверить подключение
                </button>

                {/* <div id="statusMessage" className="status-message">Готово</div> */}
            </form>
        </div>
    );
};

export default InstallDatabaseForm;