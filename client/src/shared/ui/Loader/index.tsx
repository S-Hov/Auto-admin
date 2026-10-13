import './PageLoader.css';
import './TextLoader.css';
import './DotsLoader.css';

interface LoaderProps {
    label?: string;
    className?: string;
}

export function PageLoader({ label = 'Loading...', className = '' }: LoaderProps) {
    return (
        <div className={`loader-container ${className}`} role="status" aria-label={label}>
            <div className="page-loader" aria-hidden="true" />
        </div>
    );
}

export function TextLoader({ label = 'Loading...', className = '' }: LoaderProps) {
    return <span className={`loader__loading ${className}`} role="status" aria-label={label} />;
}

export function DotsLoader({ label = 'Loading...', className = '' }: LoaderProps) {
    return <span className={`button-loader ${className}`} role="status" aria-label={label} />;
}

export { default as SpinnerLoader } from './Loader';
