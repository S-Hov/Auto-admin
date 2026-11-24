import { useId, useState } from 'react';
import type { CatalogResource } from '@auto-admin/contracts/schema-catalog';
import { Input } from '../../shared/ui/Input/Input';
import './TableSourcePicker.css';

interface Props {
    resources: CatalogResource[];
    selectedId?: number;
    onSelect: (id: number) => void;
}

export function TableSourcePicker({ resources, selectedId, onSelect }: Props) {
    const [query, setQuery] = useState('');
    const groupName = useId();
    const available = resources.filter(resource => !resource.isSystem && resource.fields.some(field => field.allowedDisplays.length > 0));
    const search = query.trim().toLowerCase();
    const matches = available.filter(resource =>
        `${resource.schemaName}.${resource.tableName}`.toLowerCase().includes(search)
        || resource.comment?.toLowerCase().includes(search));
    const selected = available.find(resource => resource.id === selectedId);

    return <fieldset className="table-source-picker">
        <legend>Таблица БД</legend>
        <label className="table-source-picker__search">
            Поиск таблицы
            <Input
                type="search"
                placeholder="Название таблицы, схемы или описание"
                value={query}
                onChange={event => setQuery(event.target.value)}
            />
        </label>
        <div className="table-source-picker__status" role="status">
            <span>{search ? `Найдено: ${matches.length} из ${available.length}` : `Доступно таблиц: ${available.length}`}</span>
            {selected && <span>Выбрана: <strong>{selected.schemaName}.{selected.tableName}</strong></span>}
        </div>
        {available.length === 0 ? <p className="table-source-picker__empty">В каталоге нет доступных таблиц с поддерживаемыми полями.</p>
            : matches.length === 0 ? <p className="table-source-picker__empty">Таблицы не найдены. Измените поисковый запрос.</p>
                : <ul className="table-source-picker__list" aria-label="Доступные таблицы">
                    {matches.map(resource => <li key={resource.id}>
                        <label className={`table-source-picker__option${resource.id === selectedId ? ' is-selected' : ''}`}>
                            <input
                                type="radio"
                                name={groupName}
                                value={resource.id}
                                checked={resource.id === selectedId}
                                onChange={() => onSelect(resource.id)}
                            />
                            <span className="table-source-picker__details">
                                <strong>{resource.schemaName}.{resource.tableName}</strong>
                                {resource.comment && <span>{resource.comment}</span>}
                                <small>
                                    {resource.type === 'view' ? 'Представление' : 'Таблица'} · Полей: {resource.fields.length}
                                </small>
                            </span>
                            {resource.id === selectedId && <span className="table-source-picker__selected">Выбрана</span>}
                        </label>
                    </li>)}
                </ul>}
    </fieldset>;
}
