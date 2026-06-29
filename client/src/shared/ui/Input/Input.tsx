export interface InputProps {
    name: string;
    label: string;
    type: 'text' | 'number' | 'password' | 'email' | 'url' | 'tel' | 'search' | 'date' | 'time' | 'datetime-local' | 'month' | 'week' | 'color';
    placeholder?: string;
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    error?: string;
}

const Input = (props: InputProps) => {
    const { name, label, type, placeholder, value, onChange, onBlur } = props;

    return (
        <>
            <label htmlFor={name}>
                {label}
                <input
                    id={name}
                    name={name}
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                />
            </label>
        </>
    )
}

export default Input;