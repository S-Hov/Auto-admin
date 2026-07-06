import './Header.css';

const FormHeader = ({ title = '', description }: { title: string; description?: string }) => {
    return (
        <>
            <div className="accent-line"></div>

            <div className="card-title">{title}</div>
            {description && <div className="card-subtitle">{description}</div>}
        </>
    );
};

export default FormHeader;