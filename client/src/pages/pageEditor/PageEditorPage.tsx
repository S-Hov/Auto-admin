import { useEffect, useState } from 'react';
import { Navigate, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { createPageSchema, type PageConfig, type PageData, type PageField, type PageRowsResult } from '@auto-admin/contracts/pages';
import type { CatalogDisplayType, CatalogResource } from '@auto-admin/contracts/schema-catalog';
import { ERROR_CODES } from '@auto-admin/contracts/common';
import { useAuth } from '../../app/providers/auth/AuthContext';
import { useAppLocale } from '../../app/routing/locale/use-app-locale';
import { appPaths } from '../../app/routing/app-paths';
import { pages } from '../../shared/api/pages';
import { schemaCatalog } from '../../shared/api/schema-catalog';
import { ApiClientError } from '../../shared/api/ApiClientError';
import { apiMessage } from '../../shared/i18n/api-message';
import { Button } from '../../shared/ui/Button/Button';
import { PageLoader } from '../../shared/ui/Loader';
import { PageHeading } from '../../features/page-configurator/PageHeading';
import { buildPageData, createFieldDrafts } from '../../features/page-configurator/model/build-page-config';
import { addColumn, removeColumn } from '../../features/page-configurator/model/edit-page-config';
import { PageTableCell } from '../../features/page-table/PageTableCell';
import '../../features/page-table/PageTable.css';
import '../dataPage/dataPage.css';
import './PageEditorPage.css';

const displayLabels: Record<CatalogDisplayType, string> = {
    text: 'Текст', number: 'Число', date: 'Дата', datetime: 'Дата и время', boolean: 'Да / Нет', image: 'Изображение', link: 'Ссылка',
};

export default function PageEditorPage() {
    const { slug } = useParams<{ slug: string }>();
    const { user } = useAuth();
    const locale = useAppLocale();
    if (!user || user.roleKey !== 'admin' || user.rights !== 'full') return <Navigate to={appPaths.home(locale)} replace />;
    return <PageEditorContent key={slug} slug={slug!} />;
}

function PageEditorContent({ slug }: { slug: string }) {
    const locale = useAppLocale();
    const navigate = useNavigate();
    const [original, setOriginal] = useState<PageData | null>(null);
    const [resources, setResources] = useState<CatalogResource[]>([]);
    const [config, setConfig] = useState<PageConfig | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [catalogMissing, setCatalogMissing] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [retry, setRetry] = useState(0);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [preview, setPreview] = useState<PageRowsResult | null>(null);
    const [previewError, setPreviewError] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewRetry, setPreviewRetry] = useState(0);
    const dirty = !saved && (original
        ? name !== original.name || description !== (original.description ?? '') || JSON.stringify(config) !== JSON.stringify(original.config)
        : config !== null || name !== '' || description !== '');
    const blocker = useBlocker(dirty && !saving);
    const resource = resources.find(item => item.id === config?.source.resourceId);
    const columns = config?.list.columns.map(id => config.fields.find(field => field.id === id)!) ?? [];

    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            setLoading(true);
            setLoadError('');
            setCatalogMissing(false);
            try {
                const [catalog, page] = await Promise.all([
                    schemaCatalog.get({ signal: controller.signal }),
                    pages.getBySlug(slug, { signal: controller.signal }).catch(error => {
                        if (error instanceof ApiClientError && error.code === ERROR_CODES.PAGE_NOT_CONFIGURED) return null;
                        throw error;
                    }),
                ]);
                if (controller.signal.aborted) return;
                setResources(catalog.data.resources);
                setOriginal(page?.data ?? null);
                setConfig(page?.data.config ?? null);
                setName(page?.data.name ?? '');
                setDescription(page?.data.description ?? '');
            } catch (error) {
                if (!controller.signal.aborted) {
                    setLoadError(apiMessage(error));
                    setCatalogMissing(error instanceof ApiClientError && error.code === ERROR_CODES.SCHEMA_CATALOG_REQUIRED);
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        void load();
        return () => controller.abort();
    }, [slug, retry]);

    useEffect(() => {
        if (!original) return;
        const controller = new AbortController();
        async function loadPreview() {
            setPreviewLoading(true);
            setPreviewError('');
            try {
                // The rows API only accepts sizes allowed by the saved page.
                const limit = Math.min(...original!.config.list.pagination.pageSizeOptions);
                const response = await pages.getRows(original!.pageId, { limit }, { signal: controller.signal });
                if (controller.signal.aborted) return;
                if (response.data.revision !== original!.revision) {
                    setPreviewError('Страница уже изменена. Вернитесь на страницу и откройте редактор заново.');
                    return;
                }
                setPreview(response.data);
            } catch (error) {
                if (!controller.signal.aborted) setPreviewError(apiMessage(error));
            } finally {
                if (!controller.signal.aborted) setPreviewLoading(false);
            }
        }
        void loadPreview();
        return () => controller.abort();
    }, [original, previewRetry]);

    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    useEffect(() => {
        if (saved) void navigate(appPaths.page(locale, slug));
    }, [saved, navigate, locale, slug]);

    function chooseResource(id: number) {
        const next = resources.find(item => item.id === id && !item.isSystem);
        if (!next) return;
        let selected = 0;
        const fields = createFieldDrafts(next).map(field => ({ ...field,
            selected: next.fields.find(item => item.id === field.fieldId)!.allowedDisplays.length > 0 && selected++ < 10,
        }));
        const data = buildPageData({ resource: next, name: name.trim() || next.tableName.slice(0, 100), description,
            fields, keyName: next.recordKeys[0]?.name ?? '', pageSize: 25, sortFieldId: null, sortDirection: 'asc' });
        setConfig(data.config);
        if (!name.trim()) setName(data.name);
    }

    function updateField(id: string, patch: Partial<PageField>) {
        if (!config) return;
        setConfig({ ...config, fields: config.fields.map(field => field.id === id ? { ...field, ...patch } : field) });
    }

    function moveColumn(index: number, direction: number) {
        if (!config) return;
        const next = [...config.list.columns];
        const target = index + direction;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        setConfig({ ...config, list: { ...config.list, columns: next } });
    }

    async function save() {
        if (!config || saving) return;
        const parsed = createPageSchema.safeParse({ name, description: description.trim() || null, config });
        if (!parsed.success) {
            setSaveError(!name.trim() ? 'Укажите название страницы.' : columns.some(field => !field.label.trim())
                ? 'Укажите названия всех колонок.' : 'Проверьте настройки страницы и колонок.');
            return;
        }
        setSaving(true);
        setSaveError('');
        try {
            if (original) await pages.update(original.pageId, { ...parsed.data, revision: original.revision });
            else await pages.configureForMenu(slug, { mode: 'create', page: parsed.data });
            toast.success('Страница сохранена');
            setSaved(true);
        } catch (error) {
            setSaveError(error instanceof ApiClientError && error.status === 409
                ? 'Страница или структура базы изменились. Ваши правки остаются в редакторе. Откройте страницу в новой вкладке, чтобы проверить изменения.'
                : apiMessage(error));
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="Page"><PageLoader /></div>;
    if (loadError) return <div className="Page"><div className="container">
        <p role="alert">{loadError}</p>{catalogMissing ? <>
            <p>Сначала создайте каталог структуры базы данных.</p>
            <Button isLoading={scanning} onClick={async () => {
                setScanning(true);
                try { await schemaCatalog.scan(); setRetry(value => value + 1); }
                catch (error) { setLoadError(apiMessage(error)); }
                finally { setScanning(false); }
            }}>Просканировать базу данных</Button>
        </> : <Button onClick={() => setRetry(value => value + 1)}>Повторить</Button>}
        <Button variant="secondary" onClick={() => navigate(appPaths.page(locale, slug))}>Назад к странице</Button>
    </div></div>;

    return <div className="Page"><div className="container page-editor">
        <PageHeading name={name} description={description} onNameChange={saving || saved ? undefined : setName} onDescriptionChange={saving || saved ? undefined : setDescription}
            actions={<><Button variant="secondary" disabled={saving} onClick={() => navigate(appPaths.page(locale, slug))}>Отмена</Button>
                <Button isLoading={saving} disabled={saved || !config || !dirty || !resource || resource.isSystem} onClick={save}>Сохранить</Button></>} />
        <p className="page-editor__hint">Режим редактирования · Нажмите на название или описание, чтобы изменить их.</p>
        {saveError && <p className="alert alert-danger" role="alert">{saveError}</p>}
        <fieldset className="page-editor__body" disabled={saving || saved}>
            <div className="page-editor__settings">
                <label>Таблица БД{original
                    ? <span>{resource ? `${resource.schemaName}.${resource.tableName}` : 'Источник отсутствует в каталоге'}</span>
                    : <select value={resource?.id ?? ''} onChange={event => chooseResource(Number(event.target.value))}>
                        <option value="" disabled>Выберите таблицу</option>
                        {resources.filter(item => !item.isSystem && item.fields.some(field => field.allowedDisplays.length)).map(item =>
                            <option key={item.id} value={item.id}>{item.schemaName}.{item.tableName}</option>)}
                    </select>}</label>
                {!original && resources.every(item => item.isSystem || !item.fields.some(field => field.allowedDisplays.length)) && <p>В каталоге нет доступных таблиц с поддерживаемыми полями.</p>}
                {config && <>
                    <label>Строк на странице<input type="number" min={1} max={100} value={config.list.pagination.defaultPageSize}
                        onChange={event => {
                            const size = Number(event.target.value);
                            setConfig({ ...config, list: { ...config.list, pagination: { defaultPageSize: size,
                                pageSizeOptions: [...new Set([...config.list.pagination.pageSizeOptions.filter(value => value !== config.list.pagination.defaultPageSize), size])].sort((a, b) => a - b) } } });
                        }} /></label>
                    <label>Сортировка<select value={config.list.sorting.default[0]?.field ?? ''} onChange={event => setConfig({ ...config,
                        list: { ...config.list, sorting: { ...config.list.sorting,
                            default: event.target.value ? [{ field: event.target.value, direction: config.list.sorting.default[0]?.direction ?? 'asc' }] : [] } } })}>
                        <option value="">Без сортировки</option>
                        {config.fields.filter(field => config.list.sorting.allowed.includes(field.id)).map(field => <option key={field.id} value={field.id}>{field.label}</option>)}
                    </select></label>
                    {config.list.sorting.default.length > 0 && <label>Направление<select value={config.list.sorting.default[0].direction}
                        onChange={event => setConfig({ ...config, list: { ...config.list, sorting: { ...config.list.sorting,
                            default: config.list.sorting.default.map((sort, index) => index === 0 ? { ...sort, direction: event.target.value as 'asc' | 'desc' } : sort) } } })}>
                        <option value="asc">По возрастанию</option><option value="desc">По убыванию</option>
                    </select></label>}
                </>}
            </div>
            {config && <div className="page-table">
                <div className="page-editor__table-tools"><span>Колонки · {columns.length}</span>
                    <label>Добавить колонку<select aria-label="Добавить колонку" value="" disabled={config.fields.length >= 100} onChange={event => {
                        const source = resource?.fields.find(field => field.id === Number(event.target.value));
                        if (!source) return;
                        const existing = config.fields.find(field => field.fieldId === source.id && !config.list.columns.includes(field.id));
                        let suffix = 0;
                        let id = `field_${source.id}`;
                        while (config.fields.some(field => field.id === id)) id = `field_${source.id}_${++suffix}`;
                        setConfig(addColumn(config, existing ?? { id, fieldId: source.id, label: source.name.slice(0, 100), display: { type: source.allowedDisplays[0] } }));
                    }}><option value="">Выберите поле</option>
                        {resource?.fields.filter(field => field.allowedDisplays.length > 0 && !columns.some(column => column.fieldId === field.id)).map(field => <option key={field.id} value={field.id}>{field.name}</option>)}
                    </select></label>
                </div>
                <div className="page-table__scroll" role="region" aria-label="Редактор таблицы" tabIndex={0}>
                    <table aria-label={name || 'Настройка колонок'}><thead><tr>{columns.map((field, index) => {
                        const source = resource?.fields.find(item => item.id === field.fieldId);
                        return <th key={field.id} scope="col"><div className="page-editor__column">
                            <input aria-label={`Название колонки ${index + 1}`} maxLength={100} value={field.label} onChange={event => updateField(field.id, { label: event.target.value })} />
                            <label>Поле БД<select aria-label={`Поле БД колонки ${index + 1}`} value={field.fieldId} onChange={event => {
                                const next = resource?.fields.find(item => item.id === Number(event.target.value));
                                if (next) updateField(field.id, { fieldId: next.id, display: next.allowedDisplays.includes(field.display.type) ? field.display : { type: next.allowedDisplays[0] } });
                            }}>
                                {!source && <option value={field.fieldId}>Поле отсутствует · {field.fieldId}</option>}
                                {resource?.fields.filter(item => item.allowedDisplays.length > 0).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select></label>
                            <label>Формат<select aria-label={`Формат колонки ${index + 1}`} value={field.display.type} onChange={event => updateField(field.id, { display: { type: event.target.value as CatalogDisplayType } })}>
                                {[...new Set([field.display.type, ...(source?.allowedDisplays ?? [])])].map(type => <option key={type} value={type}>{displayLabels[type]}</option>)}
                            </select></label>
                            <small>{source ? `${source.dataType}${source.nullable ? ' · NULL' : ''}` : 'Выберите доступное поле'}</small>
                            <div className="page-editor__column-actions">
                                <Button variant="secondary" aria-label={`Переместить ${field.label} влево`} disabled={index === 0} onClick={() => moveColumn(index, -1)}>←</Button>
                                <Button variant="secondary" aria-label={`Переместить ${field.label} вправо`} disabled={index === columns.length - 1} onClick={() => moveColumn(index, 1)}>→</Button>
                                <Button variant="secondary" disabled={columns.length === 1} onClick={() => setConfig(removeColumn(config, field.id))}>Убрать</Button>
                            </div>
                        </div></th>;
                    })}</tr></thead><tbody>{preview?.rows.slice(0, 5).map((row, index) => <tr key={index}>{columns.map(field => {
                        const savedField = original?.config.fields.find(item => item.fieldId === field.fieldId);
                        return <td key={field.id}><PageTableCell field={field} value={savedField ? row[savedField.id] : undefined} /></td>;
                    })}</tr>)}</tbody></table>
                </div>
                <p className="page-editor__hint">{previewLoading ? 'Загрузка предпросмотра…' : !original
                    ? 'Данные появятся после создания страницы.'
                    : 'Предпросмотр: до 5 строк сохранённой страницы. Данные новых полей и выбранная сортировка появятся после сохранения.'}</p>
                {preview && preview.rows.length === 0 && <p>В таблице пока нет записей.</p>}
                {previewError && <div role="alert"><p>{previewError}</p><Button variant="secondary" onClick={() => setPreviewRetry(value => value + 1)}>Повторить предпросмотр</Button></div>}
            </div>}
        </fieldset>
        {blocker.state === 'blocked' && <div className="page-editor__leave" role="alert">
            <p>Есть несохранённые изменения. Выйти и потерять их?</p>
            <Button variant="secondary" onClick={() => blocker.reset()}>Продолжить редактирование</Button>
            <Button variant="danger" onClick={() => blocker.proceed()}>Выйти без сохранения</Button>
        </div>}
    </div></div>;
}
