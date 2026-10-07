import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import CardForm from '../../../shared/form/CardForm/CardForm';
import { ControlledInput } from '../../../shared/form/ControlledInput/ControlledInput';
import { Button } from '../../../shared/ui/Button/Button';
import { toast } from 'sonner';
import { AuthFormSchema, type AuthSchemaFormValues } from '../model/AuthForm.schema';
import { auth } from '../../../shared/api/auth';
import { useAuth } from '../../../app/providers/auth/AuthContext';
import { apiMessage } from '../../../shared/i18n/api-message';
import { applyFieldErrors } from '../../../shared/api/apply-field-errors';
import { useTranslation } from 'react-i18next';

interface FieldConfig {
    name: keyof AuthSchemaFormValues;
    label: string;
    type?: 'text' | 'password';
    placeholder: string;
}

const AuthForm = () => {
    const { i18n } = useTranslation();
    const { refreshAuth } = useAuth();
    const fields: FieldConfig[] = [
        {
            name: 'userName',
            label: i18n.t('authForm:fields.userName.label'),
            placeholder: i18n.t('authForm:fields.userName.placeholder'),
        },
        {
            name: 'password',
            label: i18n.t('authForm:fields.password.label'),
            type: 'password',
            placeholder: i18n.t('authForm:fields.password.placeholder'),
        },
    ];

    const {
        control,
        handleSubmit,
        setError,
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
                loading: i18n.t('authForm:requestInProgress'),
                success: (response) => apiMessage(response),
                error: (err) => {
                    applyFieldErrors(err, setError, ['userName', 'password']);
                    return apiMessage(err);
                },

            }).unwrap();

            await refreshAuth();
        } catch {
            // Ошибка уже отображена через toast
        }
    };

    return (
        <CardForm
            headerTitle={i18n.t('authForm:title')}
            headerDescription={i18n.t('authForm:description')}
            onSubmit={handleSubmit(onSubmit)}
        >
            {
                fields.map((field) => (
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
                {i18n.t('authForm:submit')}
            </Button>
        </CardForm>
    );
};

export default AuthForm;
