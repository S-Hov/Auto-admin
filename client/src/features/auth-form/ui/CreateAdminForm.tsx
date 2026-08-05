import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import CardForm from '../../../shared/form/CardForm/CardForm';
import { ControlledInput } from '../../../shared/form/ControlledInput/ControlledInput';
import { Button } from '../../../shared/ui/Button/Button';
import { toast } from 'sonner';
import { AuthFormSchema, type AuthSchemaFormValues } from '../model/AuthForm.schema';
import { auth } from '../../../shared/api/auth';
import type { ApiError } from '../../../shared/api/apiClient';
import { useAuth } from '../../../app/providers/auth/AuthContext';

interface FieldConfig {
    name: keyof AuthSchemaFormValues;
    label: string;
    type?: 'text' | 'password';
    placeholder: string;
}

const FIELDS: FieldConfig[] = [
    { name: 'userName', label: 'Имя пользователя', placeholder: 'admin' },
    { name: 'password', label: 'Пароль', type: 'password', placeholder: '••••••••' },
] as const;

const AuthForm = () => {
    const { refreshAuth } = useAuth();

    const {
        control,
        handleSubmit,
        formState: { isSubmitting }
    } = useForm<AuthSchemaFormValues>({
        mode: 'onChange',
        resolver: zodResolver(AuthFormSchema),
        defaultValues: {
            userName: '',
            password: '',
        }
    });

    const onSubmit = async (data: AuthSchemaFormValues) => {
        try {
            await toast.promise(auth.login(data), {
                loading: 'Выполняется запрос...',
                success: (response) => response.message,
                error: (error: ApiError) => error.message,

            }).unwrap();

            await refreshAuth();
        } catch {
            // Ошибка уже отображена через toast
        }
    };

    return (
        <CardForm
            headerTitle="Вход в админ панель"
            headerDescription="Введите имя и пароль пользователя"
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
                Вход
            </Button>
        </CardForm>
    );
};

export default AuthForm;