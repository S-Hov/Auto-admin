import { type ComponentPropsWithRef } from 'react';

import './Button.css';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
    isLoading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
}

export const Button = ({
    isLoading,
    variant = 'primary',
    className = '',
    disabled,
    children,
    ...props
}: ButtonProps) => {
    const buttonClassName = `button base-button btn-${variant} ${disabled ? 'is-disabled' : ''} ${isLoading ? 'btn-loading' : ''} ${className}`.trim();
    return (
        <button
            {...props}
            className={buttonClassName}
            disabled={disabled || isLoading}
        >
            {isLoading
                ? <span className="button-loader"></span>
                : children
            }

        </button>
    );
}