import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageLoader } from "../../shared/ui/Loader";
import { pages } from "../../shared/api/pages";
import type { PageData } from "@auto-admin/contracts/pages";
import { toast } from "sonner";

const DataPage = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState<PageData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { slug } = useParams<{ slug: string }>();

    useEffect(() => {
        const controller = new AbortController();

        async function loadPage() {
            setIsLoading(true);
            setError(null);
            setPage(null);

            try {
                if (!slug) {
                    toast.error("Не указан адрес страницы");
                    throw new Error("Не указан адрес страницы");
                }

                const response = await pages.getBySlug(slug, {
                    signal: controller.signal,
                });

                if (!controller.signal.aborted) {
                    setPage(response.data);
                }
            } catch {
                if (!controller.signal.aborted) {
                    toast.error("Не удалось загрузить страницу");
                    setError("Не удалось загрузить страницу");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadPage();

        return () => controller.abort();
    }, [slug]);

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
                    ) : (
                        <div>
                            <h1></h1>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DataPage;
