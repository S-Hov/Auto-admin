import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import CardForm from '../../../shared/form/CardForm/CardForm';
import { ControlledInput } from '../../../shared/form/ControlledInput/ControlledInput';
import { Button } from '../../../shared/ui/Button/Button';
import { CreateAdminSchema, type CreateAdminFormValues } from '../model/CreateAdmin.schema';
import { auth } from '../../../shared/api/database/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface FieldConfig {
    name: keyof CreateAdminFormValues;
    label: string;
    type?: 'text' | 'password';
    placeholder: string;
}

const FIELDS: FieldConfig[] = [
    { name: 'userName', label: 'Имя пользователя', placeholder: 'admin' },
    { name: 'password', label: 'Пароль', type: 'password', placeholder: '••••••••' },
    { name: 'confirm_password', label: 'Подтвердите пароль', type: 'password', placeholder: '••••••••' },
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
            confirm_password: '',
        }
    });

    const navigate = useNavigate();

    const onSubmit = (data: CreateAdminFormValues) => {
    console.log('data :', data);
        const createAdminPromise = auth.register(data)

        toast.promise(createAdminPromise, {
            loading: 'Создаём администратора...',

            success: (response) => {
                if (response.success) {
                    if(response.data?.redirectedTo) navigate(response.data.redirectedTo);
                    return `${response.message}`;
                }
                throw new Error('Сервер отклонил параметры подключения');
            }
        })
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
                Create Admin
            </Button>
        </CardForm>
    );
};

export default CreateAdminForm;