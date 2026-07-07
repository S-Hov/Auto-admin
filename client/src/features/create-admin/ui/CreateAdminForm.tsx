import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import CardForm from '../../../shared/form/CardForm/CardForm';
import { ControlledInput } from '../../../shared/form/ControlledInput/ControlledInput';
import { Button } from '../../../shared/ui/Button/Button';
import { CreateAdminSchema, type CreateAdminFormValues } from '../model/CreateAdmin.schema';

interface FieldConfig {
    name: keyof CreateAdminFormValues;
    label: string;
    type?: 'text' | 'password';
    placeholder: string;
}

const FIELDS: FieldConfig[] = [
    { name: 'username', label: 'Имя пользователя', placeholder: 'admin' },
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
            username: '',
            password: '',
            confirm_password: '',
        }
    });

    const onSubmit = () => {
        console.log('l')
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