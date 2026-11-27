import { useState, type ReactNode } from 'react';
import './PageHeading.css';

interface Props {
    name: string;
    description: string | null;
    actions?: ReactNode;
    onNameChange?: (value: string) => void;
    onDescriptionChange?: (value: string) => void;
}

export function PageHeading({ name, description, actions, onNameChange, onDescriptionChange }: Props) {
    const [editing, setEditing] = useState<'name' | 'description' | null>(null);
    return <header className="page-heading">
        <div className="page-heading__text">
            <h1>{onNameChange ? editing === 'name'
                ? <input autoFocus aria-label="Название страницы" maxLength={100} value={name}
                    onChange={event => onNameChange(event.target.value)} onBlur={() => setEditing(null)}
                    onKeyDown={event => { if (event.key === 'Enter' || event.key === 'Escape') setEditing(null); }} />
                : <button type="button" className="page-heading__editable" onClick={() => setEditing('name')}>{name || 'Название страницы'}</button>
                : name}</h1>
            {(description || onDescriptionChange) && <p>{onDescriptionChange ? editing === 'description'
                ? <textarea autoFocus aria-label="Описание страницы" value={description ?? ''} rows={2}
                    onChange={event => onDescriptionChange(event.target.value)} onBlur={() => setEditing(null)} />
                : <button type="button" className="page-heading__editable" onClick={() => setEditing('description')}>{description || 'Добавить описание'}</button>
                : description}</p>}
        </div>
        {actions && <div className="page-heading__actions">{actions}</div>}
    </header>;
}
