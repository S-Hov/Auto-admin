import { Controller } from 'react-hook-form';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Input } from '../../ui/Input/Input';

import './ControlledInput.css';

interface ControlledInputProps<T extends FieldValues> {
    name: Path<T>;
    control: Control<T>;
    label: string;
    type?: 'text' | 'number' | 'password';
    placeholder?: string;
};

export function ControlledInput<T extends FieldValues>({
    name,
    control,
    label,
    type = 'text',
    placeholder,
}: ControlledInputProps<T>) {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...fieldProps }, fieldState: { error } }) => (
                <div className="field-group">
                    <label htmlFor={name}>{label}</label>
                    
                    <Input
                        {...fieldProps}
                        id={name}
                        type={type}
                        placeholder={placeholder}
                        value={value ?? ''}
                        isError={!!error}
                        
                        onChange={(e) => {
                            const val = e.target.value;
                            onChange(type === 'number' ? (val === '' ? '' : Number(val)) : val);
                        }}
                    />
                    
                    {error && <p className="error-message">{error.message}</p>}
                </div>
            )}
        />
    );
};
