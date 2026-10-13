import { type ComponentPropsWithRef } from 'react';
import { DotsLoader } from '../Loader';

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
                ? <DotsLoader />
                : children
            }

        </button>
    );
}
