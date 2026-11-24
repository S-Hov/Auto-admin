import { useState } from 'react';
import { PAGE_JOIN_LIMIT, type PageConfig, type PageField, type PageJoin } from '@auto-admin/contracts/pages';
import type { CatalogDisplayType, CatalogResource } from '@auto-admin/contracts/schema-catalog';
import Modal from '../../shared/ui/Modal/Modal';
import { Button } from '../../shared/ui/Button/Button';
import { TableSourcePicker } from './TableSourcePicker';

interface Props {
    config: PageConfig;
    primary: CatalogResource;
    resources: CatalogResource[];
    displayLabels: Record<CatalogDisplayType, string>;
    onClose: () => void;
    onAdd: (field: PageField, join?: PageJoin) => void;
    editingJoin?: PageJoin;
    onEditJoin: (join: PageJoin) => void;
}

const emptyPair = { leftFieldId: 0, rightFieldId: 0 };

export function AddPageColumnModal({ config, primary, resources, displayLabels, onClose, onAdd, editingJoin, onEditJoin }: Props) {
    const [source, setSource] = useState(primary.tableName);
    const [connecting, setConnecting] = useState(Boolean(editingJoin));
    const [resourceId, setResourceId] = useState(editingJoin?.resourceId);
    const [from, setFrom] = useState(editingJoin?.from ?? primary.tableName);
    const [type, setType] = useState<PageJoin['type']>(editingJoin?.type ?? 'LEFT');
    const [pairs, setPairs] = useState(editingJoin?.on ?? [emptyPair]);
    const [fieldId, setFieldId] = useState(0);
    const [label, setLabel] = useState('');
    const [display, setDisplay] = useState<CatalogDisplayType>('text');
    const [emptyText, setEmptyText] = useState('');
    const joins = config.joins ?? [];
    const bindings = new Map([[primary.tableName, primary]]);
    for (const join of joins) {
        const resource = resources.find(item => item.id === join.resourceId);
        if (resource) bindings.set(join.alias, resource);
    }
    const joinParents = [primary.tableName, ...joins.slice(0, editingJoin ? joins.indexOf(editingJoin) : joins.length).map(join => join.alias)]
        .filter(alias => bindings.has(alias));
    const parent = bindings.get(from);
    const resource = connecting ? resources.find(item => item.id === resourceId) : bindings.get(source);
    const occupied = new Set([...bindings.keys(), ...joins.map(join => join.alias)].map(alias => alias.toLowerCase()));
    const base = (resource?.tableName ?? 'related').replace(/[^a-zA-Z0-9_]/g, '_').replace(/^([0-9])/, '_$1').slice(0, 54);
    let alias = editingJoin?.alias ?? base;
    for (let suffix = 2; !editingJoin && occupied.has(alias.toLowerCase()); suffix++) alias = `${base}_${suffix}`;
    const qualifier = connecting ? alias : source;
    const used = new Set(config.fields.filter(field => config.list.columns.includes(field.id))
        .filter(field => (field.column?.split('.')[0] ?? primary.tableName) === qualifier)
        .map(field => field.fieldId));
    const choices = resource?.fields.filter(field => field.allowedDisplays.length && (connecting || !used.has(field.id))) ?? [];
    const field = choices.find(item => item.id === fieldId);
    const validPairs = pairs.every(pair => pair.leftFieldId && pair.rightFieldId)
        && new Set(pairs.map(pair => pair.leftFieldId)).size === pairs.length;

    function submit() {
        const join = connecting && validPairs && parent && resource
            ? { alias, resourceId: resource.id, ...(from !== primary.tableName ? { from } : {}), type, on: pairs } : undefined;
        if (editingJoin) {
            if (join) onEditJoin(join);
            return;
        }
        if (!field || !resource || !label.trim() || (connecting && !join)) return;
        const column = `${qualifier}.${field.name}`;
        const previous = config.fields.find(item => !config.list.columns.includes(item.id) && item.fieldId === field.id
            && (item.column ?? `${primary.tableName}.${field.name}`) === column);
        let id = `field_${field.id}`;
        for (let suffix = 2; config.fields.some(item => item.id === id); suffix++) id = `field_${field.id}_${suffix}`;
        onAdd({ id: previous?.id ?? id, column, fieldId: field.id, label: label.trim(), display: { type: display },
            ...(emptyText ? { emptyText } : {}) },
        join);
    }

    return <Modal open onClose={onClose} title={editingJoin ? `Соединение · ${editingJoin.alias}` : 'Добавить колонку'}>
        <form className="page-column-modal" onSubmit={event => { event.preventDefault(); submit(); }}>
            {!editingJoin && <label>Источник поля
                <select value={connecting ? '' : source} onChange={event => {
                    setSource(event.target.value);
                    setConnecting(event.target.value === '');
                    setFieldId(0);
                    setLabel('');
                }}>
                    {[...bindings].map(([alias, item]) => <option key={alias} value={alias}>
                        {alias === item.tableName ? alias : `${alias} · ${item.tableName}`}
                    </option>)}
                    <option value="" disabled={joins.length >= PAGE_JOIN_LIMIT}>Подключить таблицу</option>
                </select>
            </label>}
            {connecting && !editingJoin && <TableSourcePicker resources={resources} selectedId={resourceId} onSelect={id => {
                setResourceId(id);
                setPairs([emptyPair]);
                setFieldId(0);
                setLabel('');
            }} />}
            {connecting && resource && <>
                <label>Тип соединения<select value={type} onChange={event => setType(event.target.value as PageJoin['type'])}>
                    <option value="LEFT">LEFT JOIN — сохранить все строки слева</option>
                    <option value="INNER">INNER JOIN — только совпадения</option>
                    <option value="RIGHT">RIGHT JOIN — сохранить все строки справа</option>
                </select></label>
                <label>Связать с<select value={from} onChange={event => {
                    setFrom(event.target.value);
                    setPairs([emptyPair]);
                }}>{joinParents.map(alias => <option key={alias}>{alias}</option>)}</select></label>
                <fieldset className="page-column-modal__conditions">
                    <legend>Условия соединения</legend>
                    {pairs.map((pair, index) => <div className="page-column-modal__pair" key={index}>
                        <label>Поле {from}<select value={pair.leftFieldId} onChange={event => {
                            const leftFieldId = Number(event.target.value);
                            setPairs(pairs.map((item, i) => i === index ? { ...item, leftFieldId } : item));
                        }}>
                            <option value={0}>Выберите поле</option>
                            {parent?.fields.map(field => <option key={field.id} value={field.id}
                                disabled={pairs.some((item, i) => i !== index && item.leftFieldId === field.id)}>{field.name}</option>)}
                        </select></label>
                        <label>Поле {alias}<select value={pair.rightFieldId} onChange={event => {
                            const rightFieldId = Number(event.target.value);
                            setPairs(pairs.map((item, i) => i === index ? { ...item, rightFieldId } : item));
                        }}>
                            <option value={0}>Выберите поле</option>
                            {resource.fields.map(field => <option key={field.id} value={field.id}>{field.name}</option>)}
                        </select></label>
                        <Button type="button" variant="secondary" disabled={pairs.length === 1}
                            onClick={() => setPairs(pairs.filter((_, i) => i !== index))}>Убрать пару</Button>
                    </div>)}
                    <Button type="button" variant="secondary" disabled={pairs.length >= 16}
                        onClick={() => setPairs([...pairs, emptyPair])}>Добавить пару полей</Button>
                </fieldset>
                <p className="page-editor__hint">Несколько совпадений выводятся отдельными строками.</p>
            </>}
            {!editingJoin && resource && <label>Поле для вывода<select value={fieldId} onChange={event => {
                const next = choices.find(item => item.id === Number(event.target.value));
                setFieldId(next?.id ?? 0);
                setLabel(next?.name.slice(0, 100) ?? '');
                setDisplay(next?.allowedDisplays[0] ?? 'text');
            }}>
                <option value={0}>{choices.length ? 'Выберите поле' : 'Нет свободных полей'}</option>
                {choices.map(field => <option key={field.id} value={field.id}>{qualifier}.{field.name}</option>)}
            </select></label>}
            {!editingJoin && field && <>
                <label>Название колонки<input value={label} maxLength={100} required onChange={event => setLabel(event.target.value)} /></label>
                <label>Формат<select value={display} onChange={event => setDisplay(event.target.value as CatalogDisplayType)}>
                    {field.allowedDisplays.map(type => <option key={type} value={type}>{displayLabels[type]}</option>)}
                </select></label>
                <label>Текст при отсутствии значения<input value={emptyText} placeholder="—" maxLength={100}
                    onChange={event => setEmptyText(event.target.value)} /></label>
            </>}
            <div className="page-column-modal__actions">
                <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
                <Button type="submit" disabled={editingJoin ? !resource || !parent || !validPairs
                    : !field || !label.trim() || (connecting && !validPairs)}>
                    {editingJoin ? 'Применить' : 'Добавить колонку'}
                </Button>
            </div>
        </form>
    </Modal>;
}
