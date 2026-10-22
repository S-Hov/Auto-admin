import { Controller } from 'react-hook-form';
import { useId } from 'react';
import type { Control, FieldValues, Path, PathValue } from 'react-hook-form';
import { Input } from '../../ui/Input/Input';

import './ControlledInput.css';

interface ControlledInputProps<T extends FieldValues> {
    name: Path<T>;
    control: Control<T>;
    label: string;
    type?: 'text' | 'number' | 'password' | 'checkbox';
    placeholder?: string;
    defaultValue?: string | number | boolean;
    disabled?: boolean;
    showLabel?: boolean;
};

export function ControlledInput<T extends FieldValues>({
    name,
    control,
    label,
    type = 'text',
    placeholder,
    defaultValue,
    disabled = false,
    showLabel = true,
}: ControlledInputProps<T>) {
    const id = useId();
    const errorId = `${id}-error`;
    const isCheckbox = type === 'checkbox';

    return (
        <Controller
            name={name}
            control={control}
            defaultValue={(defaultValue ?? (isCheckbox ? false : undefined)) as PathValue<T, Path<T>> | undefined}
            render={({ field: { onChange, value, ...fieldProps }, fieldState: { error } }) => {
                const input = (
                    <Input
                        {...fieldProps}
                        id={id}
                        type={type}
                        placeholder={isCheckbox ? undefined : placeholder}
                        {...(isCheckbox ? { checked: value === true } : { value: value ?? '' })}
                        isError={!!error}
                        aria-invalid={!!error}
                        aria-describedby={error ? errorId : undefined}
                        aria-label={showLabel ? undefined : label}
                        disabled={disabled}
                        onChange={(e) => {
                            if (isCheckbox) {
                                onChange(e.target.checked);
                                return;
                            }
                            const val = e.target.value;
                            onChange(type === 'number' ? (val === '' ? '' : Number(val)) : val);
                        }}
                    />
                );
                return (
                    <div className={`field-group${isCheckbox ? ' field-group--checkbox' : ''}`}>
                        {isCheckbox ? (
                            <label className="field-group__checkbox-label" htmlFor={id}>
                                {input}
                                {showLabel && <span>{label}</span>}
                            </label>
                        ) : (
                            <>
                                {showLabel && <label htmlFor={id}>{label}</label>}
                                {input}
                            </>
                        )}
                        {error && <p id={errorId} className="error-message" role="alert">{error.message}</p>}
                    </div>
                );
            }}
        />
    );
};
