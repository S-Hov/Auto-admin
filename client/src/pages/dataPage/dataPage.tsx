import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from '../../app/providers/auth/AuthContext';
import { useAppLocale } from '../../app/routing/locale/use-app-locale';
import { appPaths } from '../../app/routing/app-paths';
import { PageHeading } from '../../features/page-configurator/PageHeading';
import { PageLoader } from "../../shared/ui/Loader";
import { pages } from "../../shared/api/pages";
import type { PageData } from "@auto-admin/contracts/pages";
import { toast } from "sonner";
import { ApiClientError } from "../../shared/api/ApiClientError";
import { ERROR_CODES } from "@auto-admin/contracts/common";
import { apiMessage } from "../../shared/i18n/api-message";
import { Button } from '../../shared/ui/Button/Button';
import { PageConfigurator } from '../../features/page-configurator/PageConfigurator';
import { PageTable } from '../../features/page-table/PageTable';
import './dataPage.css';

const DataPage = () => {
    const { slug } = useParams<{ slug: string }>();
    return <DataPageContent key={slug} slug={slug} />;
};

const DataPageContent = ({ slug }: { slug?: string }) => {
    const navigate = useNavigate();
    const locale = useAppLocale();
    const { user } = useAuth();
    const canEdit = user?.roleKey === 'admin' && user.rights === 'full';
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState<PageData | null>(null);
    const [isPageConfigured, setIsPageConfigured] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [configuratorOpen, setConfiguratorOpen] = useState(false);
    const [reload, setReload] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        async function loadPage() {
            setIsLoading(true);
            setError(null);
            setPage(null);
            setIsPageConfigured(true);

            try {
                if (!slug) {
                    throw new Error("Не указан адрес страницы");
                }

                const response = await pages.getBySlug(slug, {
                    signal: controller.signal,
                });

                if (!controller.signal.aborted) {
                    setPage(response.data);
                }
            } catch (error: unknown) {
                if (!controller.signal.aborted) {
                    if (error instanceof ApiClientError && error.code === ERROR_CODES.PAGE_NOT_CONFIGURED) {
                        setIsPageConfigured(false);
                    }
                    else {
                        toast.info("Не удалось загрузить страницу");
                        setError(apiMessage(error));
                    }
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadPage();

        return () => controller.abort();
    }, [slug, reload]);

    return (
        <div className="Page">
            {isLoading ? (
                <PageLoader />
            ) : (
                <div className="container">
                    {error ? (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    ) : page ? (
                        <>
                            <PageHeading name={page.name} description={page.description} actions={canEdit && slug
                                ? <Button onClick={() => navigate(appPaths.pageEditor(locale, slug))}>Редактировать</Button> : undefined} />
                            <PageTable
                                key={`${page.pageId}:${page.revision}`}
                                page={page}
                                onReloadPage={() => setReload(value => value + 1)}
                            />
                        </>
                    ) : !isPageConfigured && (
                        <div className="data-page__empty">
                            <h1>Здесь будет ваша страница</h1>
                            <p>Подключите таблицу и выберите нужные колонки.</p>
                            {canEdit && slug && <>
                                <Button type="button" onClick={() => navigate(appPaths.pageEditor(locale, slug))}>Настроить страницу</Button>
                                <Button type="button" variant="secondary" onClick={() => setConfiguratorOpen(true)}>Подключить существующую</Button>
                            </>}
                        </div>
                    )}
                </div>
            )}
            {configuratorOpen && slug && <PageConfigurator slug={slug} initialMode="existing" onClose={() => setConfiguratorOpen(false)} onSaved={() => {
                setConfiguratorOpen(false);
                setReload(value => value + 1);
                toast.success('Страница подключена');
            }} />}
        </div>
    );
};

export default DataPage;
