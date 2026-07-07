import type { ComponentPropsWithRef } from 'react';
import FormHeader from '../Header/Header';
import './CardForm.css'

interface CardFormProps extends ComponentPropsWithRef<'form'>{
    className?: string;
    formID?: string;
    headerTitle?: string;
    headerDescription?: string;
    children: React.ReactNode;
}

const CardForm = ({ className = '', formID = '', headerTitle = '', headerDescription = '', children, ...props }: CardFormProps) => {
    return (
        <div className={`card form ${className}`}>
            <FormHeader title={headerTitle} description={headerDescription} />
            <form action="" id={formID} {...props}>
                {children}
            </form>
        </div>
    );
}

export default CardForm;