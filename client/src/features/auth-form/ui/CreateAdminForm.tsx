import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import CardForm from '../../../shared/form/CardForm/CardForm';
import { ControlledInput } from '../../../shared/form/ControlledInput/ControlledInput';
import { Button } from '../../../shared/ui/Button/Button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { AuthFormSchema, type AuthSchemaFormValues } from '../model/AuthForm.schema';

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

    const navigate = useNavigate();

    const onSubmit = (data: AuthSchemaFormValues) => {
        console.log('data :', data);

    }

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