import { useEffect, useState } from 'react';
import {
    PAGE_ROWS_QUERY_LIMITS,
    type PageData,
    type PageField,
    type PageRowsQuery,
    type PageRowsResult,
} from '@auto-admin/contracts/pages';
import { useTranslation } from 'react-i18next';
import { pages } from '../../shared/api/pages';
import { apiMessage } from '../../shared/i18n/api-message';
import { Button } from '../../shared/ui/Button/Button';
import { PageTableCell } from './PageTableCell';
import './PageTable.css';

type RowsState =
    | { kind: 'ready'; data: PageRowsResult }
    | { kind: 'error'; error: unknown }
    | { kind: 'stale' };

type TableQuery = PageRowsQuery & { limit: number };

export function PageTable({ page, onReloadPage }: { page: PageData; onReloadPage: () => void }) {
    const { t } = useTranslation('pageTable');
    const { pageId, revision, config } = page;
    const { pagination, sorting } = config.list;
    const [query, setQuery] = useState<TableQuery>({ offset: 0, limit: pagination.defaultPageSize });
    const [response, setResponse] = useState<{ query: TableQuery; state: RowsState } | null>(null);
    const state = response?.query === query ? response.state : null;

    useEffect(() => {
        const controller = new AbortController();

        async function loadRows() {
            try {
                const { data } = await pages.getRows(pageId, query, { signal: controller.signal });
                if (controller.signal.aborted) return;

                setResponse({
                    query,
                    state: data.revision === revision ? { kind: 'ready', data } : { kind: 'stale' },
                });
            } catch (error) {
                if (!controller.signal.aborted) setResponse({ query, state: { kind: 'error', error } });
            }
        }

        void loadRows();
        return () => controller.abort();
    }, [pageId, revision, query]);

    const fieldsById = new Map(config.fields.map(field => [field.id, field]));
    const columns = config.list.columns.map(id => fieldsById.get(id)!);
    const activeSort = query.sort ?? sorting.default[0];
    const result = state?.kind === 'ready' ? state.data : null;
    const nextOffset = query.offset + query.limit;
    const isLoading = state === null;

    function sortBy(field: PageField) {
        const direction = activeSort?.field === field.id && activeSort.direction === 'asc' ? 'desc' : 'asc';
        setQuery({ ...query, offset: 0, sort: { field: field.id, direction } });
    }

    return (
        <div className="page-table">
            <div className="page-table__scroll" role="region" aria-label={page.name} tabIndex={0}>
                <table aria-label={page.name}>
                    <thead>
                        <tr>
                            {columns.map(field => {
                                const direction = activeSort?.field === field.id ? activeSort.direction : undefined;
                                return (
                                    <th
                                        key={field.id}
                                        scope="col"
                                        aria-sort={direction && (direction === 'asc' ? 'ascending' : 'descending')}
                                    >
                                        {sorting.allowed.includes(field.id) ? (
                                            <button type="button" className="page-table__sort" onClick={() => sortBy(field)}>
                                                {field.label}
                                                <span aria-hidden="true">{direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '↕'}</span>
                                            </button>
                                        ) : field.label}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody aria-busy={isLoading}>
                        {result?.rows.map((row, index) => (
                            <tr key={result.pagination.offset + index}>
                                {columns.map(field => (
                                    <td key={field.id}><PageTableCell field={field} value={row[field.id]} /></td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isLoading && <p className="page-table__message" role="status">{t('loading')}</p>}
            {result?.rows.length === 0 && (
                <p className="page-table__message" role="status">{t(query.offset ? 'emptyPage' : 'empty')}</p>
            )}
            {state?.kind === 'error' && (
                <div className="page-table__message">
                    <p role="alert">{apiMessage(state.error)}</p>
                    <Button type="button" variant="secondary" onClick={() => setQuery({ ...query })}>{t('retry')}</Button>
                </div>
            )}
            {state?.kind === 'stale' ? (
                <div className="page-table__message">
                    <p role="alert">{t('stale')}</p>
                    <Button type="button" variant="secondary" onClick={onReloadPage}>{t('reload')}</Button>
                </div>
            ) : (
                <div className="page-table__footer">
                    <label className="page-table__size">
                        {t('pageSize')}
                        <select
                            value={query.limit}
                            onChange={event => setQuery({ ...query, limit: Number(event.target.value), offset: 0 })}
                        >
                            {pagination.pageSizeOptions.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </label>
                    <div className="page-table__navigation" role="group" aria-label={t('pagination')}>
                        <Button type="button" variant="secondary" disabled={query.offset === 0}
                            onClick={() => setQuery({ ...query, offset: query.offset - query.limit })}>
                            {t('previous')}
                        </Button>
                        <span role="status">{t('pageNumber', { number: query.offset / query.limit + 1 })}</span>
                        <Button type="button" variant="secondary"
                            disabled={!result?.pagination.hasMore || nextOffset > PAGE_ROWS_QUERY_LIMITS.maxOffset}
                            onClick={() => setQuery({ ...query, offset: nextOffset })}>
                            {t('next')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
