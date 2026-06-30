import { forwardRef, type ComponentPropsWithRef } from 'react';
import './Input.css';

interface InputProps extends ComponentPropsWithRef<'input'> {
    isError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    isError,
    type = 'text',
    className = '',
    ...props
}, ref) => {
    const inputClassName = `base-input ${isError ? 'input-error' : ''} ${className}`.trim();

    return (
        <input
            {...props}
            ref={ref}
            type={type}
            className={`input ${inputClassName}`}
        />
    );
});

Input.displayName = 'Input';
