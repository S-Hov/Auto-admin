import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import CardForm from '../../../shared/form/CardForm/CardForm';
import { ControlledInput } from '../../../shared/form/ControlledInput/ControlledInput';
import { Button } from '../../../shared/ui/Button/Button';
import { CreateAdminSchema, type CreateAdminFormValues } from '../model/CreateAdmin.schema';
import { auth } from '../../../shared/api/database/auth';
import { toast } from 'sonner';
import { useBootstrap } from '../../../app/providers/bootstrap/BootstrapContext';
import { STORAGE_KEYS } from '../../../constants/storage';
import { apiMessage } from '../../../shared/i18n/api-message';

interface FieldConfig {
    name: keyof CreateAdminFormValues;
    label: string;
    type?: 'text' | 'password';
    placeholder: string;
}

const FIELDS: FieldConfig[] = [
    { name: 'userName', label: 'Имя пользователя', placeholder: 'admin' },
    { name: 'password', label: 'Пароль', type: 'password', placeholder: '••••••••' },
    { name: 'confirmPassword', label: 'Подтвердите пароль', type: 'password', placeholder: '••••••••' },
] as const;

const CreateAdminForm = () => {
    const {
        control,
        handleSubmit,
        formState: { isSubmitting }
    } = useForm<CreateAdminFormValues>({
        mode: 'onChange',
        resolver: zodResolver(CreateAdminSchema),
        defaultValues: {
            userName: '',
            password: '',
            confirmPassword: '',
        }
    });
    const {refreshBootstrap} = useBootstrap();

    const onSubmit = async (data: CreateAdminFormValues) => {
        try {
            const createAdminPromise = auth.register(data)
    
            await toast.promise(createAdminPromise, {
                loading: 'Создаём администратора...',
    
                success: (response) => {
                    if (response.success) {
                        sessionStorage.removeItem(STORAGE_KEYS.INSTALL_TOKEN);
                        return apiMessage(response);
                    }
                    throw new Error('Сервер отклонил параметры подключения');
                },

                error: (err) => apiMessage(err),
            }).unwrap();
    
            await refreshBootstrap();
        }
        catch {
            // Ошибка уже отображена через toast
        }
    }

    return (
        <CardForm
            headerTitle="Создание администратора"
            headerDescription="Введите имя и пароль администратора"
            onSubmit={handleSubmit(onSubmit)}
        >
            {
                FIELDS.map((field) => (
                    <ControlledInput
                        key={field.name}
                        control={control}
                        name={field.name}
                        label={field.label}
                        type={field.type}
                        placeholder={field.placeholder}
                    />
                ))
            }
            <Button 
                type="submit" 
                variant='primary' 
                className="check-button w-100__percent" 
                disabled={isSubmitting} 
                isLoading={isSubmitting}
            >
                Создать администратора
            </Button>
        </CardForm>
    );
};

export default CreateAdminForm;