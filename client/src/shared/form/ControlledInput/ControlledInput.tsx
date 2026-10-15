import { Controller } from 'react-hook-form';
import type { Control, FieldValues, Path, PathValue } from 'react-hook-form';
import { Input } from '../../ui/Input/Input';

import './ControlledInput.css';

interface ControlledInputProps<T extends FieldValues> {
    name: Path<T>;
    control: Control<T>;
    label: string;
    type?: 'text' | 'number' | 'password';
    placeholder?: string;
    defaultValue?: string | number;
    disabled?: boolean;
};

export function ControlledInput<T extends FieldValues>({
    name,
    control,
    label,
    type = 'text',
    placeholder,
    defaultValue,
    disabled = false,
}: ControlledInputProps<T>) {
    return (
        <Controller
            name={name}
            control={control}
            defaultValue={defaultValue as PathValue<T, Path<T>> | undefined}
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
                        disabled={disabled}
                        
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
