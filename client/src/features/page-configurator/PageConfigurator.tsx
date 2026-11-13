import { useEffect, useState, type FormEvent } from "react";
import type { CatalogResource, CatalogDisplayType } from "@auto-admin/contracts/schema-catalog";
import type { PageListResult } from "@auto-admin/contracts/pages";
import Modal from "../../shared/ui/Modal/Modal";
import { Button } from "../../shared/ui/Button/Button";
import { Input } from "../../shared/ui/Input/Input";
import { DotsLoader } from "../../shared/ui/Loader";
import { schemaCatalog } from "../../shared/api/schema-catalog";
import { pages } from "../../shared/api/pages";
import { apiMessage } from "../../shared/i18n/api-message";
import { ApiClientError } from "../../shared/api/ApiClientError";
import { ERROR_CODES } from "@auto-admin/contracts/common";
import { buildPageData, createFieldDrafts, type FieldDraft } from "./model/build-page-config";
import "./PageConfigurator.css";

const displayLabels: Record<CatalogDisplayType, string> = {
    text: "Текст", number: "Число", date: "Дата", datetime: "Дата и время",
    boolean: "Да / Нет", image: "Изображение", link: "Ссылка",
};

interface Props { slug: string; onClose: () => void; onSaved: () => void; initialMode?: 'create' | 'existing' }

// Mounted only while open: drafts and requests belong to this modal session.
export function PageConfigurator({ slug, onClose, onSaved, initialMode = 'create' }: Props) {
    const [mode, setMode] = useState<"create" | "existing">(initialMode);
    const [resources, setResources] = useState<CatalogResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [catalogError, setCatalogError] = useState("");
    const [catalogMissing, setCatalogMissing] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [retry, setRetry] = useState(0);
    const [resourceId, setResourceId] = useState<number | null>(null);
    const [step, setStep] = useState(0);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [fields, setFields] = useState<FieldDraft[]>([]);
    const [keyName, setKeyName] = useState("");
    const [pageSize, setPageSize] = useState(25);
    const [sortFieldId, setSortFieldId] = useState<number | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [query, setQuery] = useState("");
    const [offset, setOffset] = useState(0);
    const [existing, setExisting] = useState<PageListResult | null>(null);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState("");
    const [existingId, setExistingId] = useState<number | null>(null);
    const [searchResult, setSearchResult] = useState<CatalogResource[]>(resources);
    const resource = resources.find(item => item.id === resourceId);
    const selected = fields.filter(field => field.selected);

    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            setLoading(true);
            setCatalogError("");
            setCatalogMissing(false);
            try {
                const response = await schemaCatalog.get({ signal: controller.signal });
                if (!controller.signal.aborted) {
                    setResources(response.data.resources);
                    setSearchResult(response.data.resources);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setCatalogError(apiMessage(error));
                    setCatalogMissing(error instanceof ApiClientError && error.code === ERROR_CODES.SCHEMA_CATALOG_REQUIRED);
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        void load();
        return () => controller.abort();
    }, [retry]);

    useEffect(() => {
        if (mode !== "existing") return;
        const controller = new AbortController();
        async function load() {
            setListLoading(true);
            setListError("");
            setExisting(null);
            setExistingId(null);
            try {
                const response = await pages.list({ q: query, offset }, { signal: controller.signal });
                if (!controller.signal.aborted) setExisting(response.data);
            } catch (error) {
                if (!controller.signal.aborted) setListError(apiMessage(error));
            } finally {
                if (!controller.signal.aborted) setListLoading(false);
            }
        }
        void load();
        return () => controller.abort();
    }, [mode, query, offset, retry]);

    async function scanCatalog() {
        if (scanning) return;
        setScanning(true);
        try {
            await schemaCatalog.scan();
            setResourceId(null);
            setFields([]);
            setKeyName("");
            setSortFieldId(null);
            setRetry(value => value + 1);
        } catch (error) {
            setCatalogError(apiMessage(error));
        } finally {
            setScanning(false);
        }
    }

    function chooseResource(item: CatalogResource) {
        if (item.isSystem) return;
        setResourceId(item.id);
        setFields(createFieldDrafts(item));
        setKeyName(item.recordKeys[0]?.name ?? "");
        setSortFieldId(null);
        setSaveError("");
        if (!name) setName(item.tableName.slice(0, 100));
    }

    function updateField(fieldId: number, patch: Partial<FieldDraft>) {
        setFields(previous => previous.map(field => field.fieldId === fieldId ? { ...field, ...patch } : field));
        if (patch.selected === false && sortFieldId === fieldId) setSortFieldId(null);
    }

    function moveField(index: number, direction: number) {
        const next = [...fields];
        const other = index + direction;
        if (other < 0 || other >= next.length) return;
        [next[index], next[other]] = [next[other], next[index]];
        setFields(next);
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (saving) return;
        if (mode === "create" && step === 0) { setStep(1); return; }
        setSaveError("");
        if (mode === "create" && (!resource || !name.trim() || selected.length === 0 || selected.length > 100)) {
            setSaveError("Укажите название и выберите от 1 до 100 полей."); return;
        }
        if (mode === "existing" && existingId === null) return;
        setSaving(true);
        try {
            const payload = mode === "existing"
                ? { mode: "existing" as const, pageId: existingId! }
                : { mode: "create" as const, page: buildPageData({ resource: resource!, name, description, fields, keyName, pageSize, sortFieldId, sortDirection }) };
            await pages.configureForMenu(slug, payload);
        } catch (error) {
            setSaveError(apiMessage(error));
            setSaving(false);
            return;
        }
        onSaved();
    }

    const searchResources = (query: string) => {
        const result = resources.filter(item => item.tableName.toLowerCase().includes(query.toLowerCase()));
        setSearchResult(result);
    }

    return <Modal open onClose={() => { if (!saving && !scanning) onClose(); }} title="Настройка страницы">
        <div className="page-configurator">
            {initialMode === 'create' && <div className="page-configurator__tabs" role="group" aria-label="Способ настройки">
                <Button type="button" disabled={saving || scanning} variant={mode === "create" ? "primary" : "secondary"} onClick={() => { setMode("create"); setSaveError(""); }}>Новая страница</Button>
                <Button type="button" disabled={saving || scanning} variant={mode === "existing" ? "primary" : "secondary"} onClick={() => { setMode("existing"); setSaveError(""); }}>Выбрать существующую</Button>
            </div>}
            <form onSubmit={submit}>
                <fieldset disabled={saving || scanning} className="page-configurator__fieldset">
                    {mode === "create" ? <>
                        <p className="page-configurator__hint">{step === 0 ? "Шаг 1 из 2 · Выберите источник данных" : "Шаг 2 из 2 · Настройте колонки списка"}</p>
                        {step === 0 ? <>
                            <label className="page-configurator__label">
                                Название страницы
                                <Input value={name} onChange={event => setName(event.target.value)} maxLength={100} required />
                            </label>
                            <label className="page-configurator__label">
                                Описание
                                <Input value={description} onChange={event => setDescription(event.target.value)} />
                            </label>
                            <p>Выбор источника данных</p>
                            {loading
                                ? <div className="page-configurator__status" role="status">
                                    <DotsLoader />
                                </div>
                                : catalogError ? <div role="alert"><p>{catalogError}</p>
                                    {catalogMissing && <p className="page-configurator__hint">Сначала создайте каталог структуры: сканирование прочитает названия таблиц, полей и ключей. Данные пользовательских таблиц не изменяются.</p>}
                                    <Button type="button" variant="secondary" isLoading={scanning} onClick={catalogMissing ? () => void scanCatalog() : () => setRetry(value => value + 1)}>{catalogMissing ? "Просканировать базу данных" : "Повторить загрузку"}</Button>
                                </div> : <>
                                    <div
                                        className="page-configurator__resources"
                                        role="group"
                                        aria-label="Источник данных"
                                    >
                                        <Input onChange={(event) => searchResources(event.target.value)} maxLength={100} placeholder="Поиск по названию таблицы" type="search" />
                                        {searchResult.map(item => <button key={item.id} type="button" disabled={item.isSystem || !item.fields.some(field => field.allowedDisplays.length > 0)} aria-pressed={resourceId === item.id} className={`page-configurator__resource${resourceId === item.id ? " is-selected" : ""}`} onClick={() => chooseResource(item)}>
                                            <span className="page-configurator__resource-title">
                                                {item.tableName}
                                                <span className="page-configurator__badge">
                                                    {item.isSystem ? "Системная" : item.type === "view" ? "Представление" : "Таблица"}
                                                </span>
                                            </span>
                                            <span className="page-configurator__hint">{item.schemaName} · {item.fields.length} полей</span>
                                            {item.comment && <span>{item.comment}</span>}
                                        </button>)}
                                    </div>
                                    {resources.length === 0 && <p>В каталоге пока нет таблиц. Выполните сканирование базы данных.</p>}
                                    <p className="page-configurator__hint">Системные таблицы видны для справки. Их изменение доступно только через специальные разделы админки.</p>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        isLoading={scanning}
                                        onClick={() => void scanCatalog()}
                                    >
                                        Обновить каталог базы
                                    </Button>
                                </>}
                        </> : resource && <>
                            <h3>{name} <small className="page-configurator__hint">· {resource.tableName}</small></h3>
                            <p className="page-configurator__hint">Выберите поля, подписи и формат. Стрелки меняют порядок колонок. Выбрано: {selected.length}</p>
                            <div className="page-configurator__fields">
                                {fields.map((field, index) => {
                                    const source = resource.fields.find(item => item.id === field.fieldId)!;
                                    return <div key={field.fieldId} className={`page-configurator__field${field.selected ? " is-selected" : ""}`}>
                                        <label className="page-configurator__field-name">
                                            <Input
                                                type="checkbox"
                                                checked={field.selected}
                                                disabled={source.allowedDisplays.length === 0 || (!field.selected && selected.length >= 100)}
                                                onChange={event => updateField(field.fieldId, { selected: event.target.checked })}
                                                />
                                            <span>
                                                {source.name}
                                                <small>{source.dataType}{source.allowedDisplays.length === 0 ? " · пока не поддерживается" : ""}</small>
                                            </span>
                                        </label>
                                        <Input aria-label={`Подпись ${source.name}`} value={field.label} disabled={!field.selected} maxLength={100} onChange={event => updateField(field.fieldId, { label: event.target.value })} />
                                        <select className="input" aria-label={`Формат ${source.name}`} disabled={!field.selected} value={field.display} onChange={event => updateField(field.fieldId, { display: event.target.value as CatalogDisplayType })}>
                                            {source.allowedDisplays.map(type => <option key={type} value={type}>{displayLabels[type]}</option>)}
                                        </select>
                                        <div className="page-configurator__arrows">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                aria-label={`Поднять ${source.name}`}
                                                disabled={index === 0}
                                                onClick={() => moveField(index, -1)}
                                            >
                                                ↑
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                aria-label={`Опустить ${source.name}`}
                                                disabled={index === fields.length - 1}
                                                onClick={() => moveField(index, 1)}
                                            >
                                                ↓
                                            </Button>
                                        </div>
                                    </div>;
                                })}
                            </div>
                            <div className="page-configurator__settings">
                                <label className="page-configurator__label">
                                    Ключ записи
                                    <select
                                        className="input"
                                        value={keyName}
                                        onChange={event => setKeyName(event.target.value)}
                                    >
                                        <option value="">Без ключа</option>
                                        {resource.recordKeys.map(key => 
                                            <option
                                                key={key.name}
                                                value={key.name}
                                            >
                                                {key.name} ({key.fieldIds.map(id => resource.fields.find(field => field.id === id)?.name).join(", ")})
                                            </option>
                                        )}
                                    </select>
                                </label>
                                <label className="page-configurator__label">
                                    Записей на странице
                                    <select
                                        className="input"
                                        value={pageSize}
                                        onChange={event => setPageSize(Number(event.target.value))}>{[10, 25, 50, 100].map(size => <option key={size}>{size}</option>)}
                                    </select>
                                </label>
                                <label className="page-configurator__label">
                                    Сортировка
                                    <select
                                        className="input"
                                        value={sortFieldId ?? ""}
                                        onChange={event => setSortFieldId(event.target.value ? Number(event.target.value) : null)}
                                    >
                                        <option value="">По ключу записи</option>
                                        {selected.map(field => <option key={field.fieldId} value={field.fieldId}>{field.label}</option>)}
                                    </select>
                                </label>
                                <label className="page-configurator__label">
                                    Порядок
                                    <select
                                        className="input"
                                        disabled={sortFieldId === null}
                                        value={sortDirection}
                                        onChange={event => setSortDirection(event.target.value as "asc" | "desc")}
                                    >
                                        <option value="asc">По возрастанию</option>
                                        <option value="desc">По убыванию</option>
                                    </select>
                                </label>
                            </div>
                            {!keyName
                                && <p className="page-configurator__hint">
                                        Без уникального ключа нельзя надёжно открывать и изменять отдельные записи; порядок при пагинации может быть нестабильным.
                                    </p>
                            }
                        </>}
                    </> : <>
                        <p className="page-configurator__hint">Подключите готовую страницу. Её конфигурация будет общей для всех пунктов меню, которые на неё ссылаются.</p>
                        <label className="page-configurator__label">
                            Поиск страницы
                            <Input
                                value={query}
                                maxLength={100}
                                onChange={event => { setQuery(event.target.value); setOffset(0); setExistingId(null); }}
                                placeholder="Название страницы"
                            />
                        </label>
                        {listLoading
                            ? <div className="page-configurator__status" role="status"><DotsLoader /> Загружаем страницы…</div>
                            : listError
                                ? <div role="alert">
                                    <p>{listError}</p>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setRetry(value => value + 1)}
                                    >
                                        Повторить
                                    </Button>
                                </div>
                                : <>
                            <div className="page-configurator__resources">
                                {
                                existing?.items
                                    .map(item =>
                                        <button
                                            type="button"
                                            key={item.pageId}
                                            className={`page-configurator__resource${existingId === item.pageId ? " is-selected" : ""}`}
                                            aria-pressed={existingId === item.pageId}
                                            onClick={() => setExistingId(item.pageId)}
                                        >
                                            <strong>{item.name}</strong>
                                            <small className="page-configurator__hint">
                                                Страница #{item.pageId}
                                            </small>
                                        </button>
                                    )
                                }
                            </div>
                            {existing?.items.length === 0 && <p>Страницы не найдены.</p>}
                            <div className="page-configurator__pagination">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={offset === 0}
                                    onClick={() => { setExistingId(null); setOffset(value => Math.max(0, value - 25)); }}
                                >
                                    Назад
                                </Button>
                                <span>
                                    Страница {Math.floor(offset / 25) + 1}
                                </span>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={!existing?.pagination.hasMore || offset >= 100000}
                                    onClick={() => { setExistingId(null); setOffset(value => value + 25); }}
                                >
                                    Далее
                                </Button>
                            </div>
                        </>}
                    </>}
                </fieldset>
                {saveError && <p className="page-configurator__error" role="alert">{saveError}</p>}
                <footer className="page-configurator__footer">
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={saving || scanning}
                        onClick={mode === "create" && step === 1 ? () => setStep(0) : onClose}
                    >
                        {mode === "create" && step === 1 ? "Назад" : "Отмена"}
                    </Button>
                    <Button
                        type="submit"
                        isLoading={saving}
                        disabled={scanning || (mode === "create" ? (step === 0 ? !resource || loading || !!catalogError || !name.trim() : selected.length === 0) : existingId === null || listLoading)}
                    >
                        {mode === "create" ? step === 0 ? "Настроить поля" : "Создать и подключить" : "Подключить страницу"}
                    </Button>
                </footer>
            </form>
        </div>
    </Modal>;
}
