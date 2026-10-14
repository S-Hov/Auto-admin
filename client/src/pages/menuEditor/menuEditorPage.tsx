import { useEffect, useState } from "react";
import type { ManageableMenuItemDto } from "../../shared/api/menu/menu.types";
import { menu } from "../../shared/api/menu";
import { toast } from "sonner";
import { apiMessage } from "../../shared/i18n/api-message";
import { useAuth } from "../../app/providers/auth/AuthContext";
import { Navigate } from "react-router-dom";
import { appPaths } from "../../app/routing/app-paths";
import { useAppLocale } from "../../app/routing/locale/use-app-locale";
import { Button } from "../../shared/ui/Button/Button";
import { PageLoader } from "../../shared/ui/Loader";

interface StatusLoading {
    status: "loading";
}

interface StatusError {
    status: "error";
    message: string;
}

interface StatusReady {
    status: "ready";
    items: ManageableMenuItemDto[];
}

type LoadingStatus = StatusLoading | StatusError | StatusReady;

const MenuEditorPage = () => {
    const { user } = useAuth();
    const locale = useAppLocale();
    if (!user || user.roleKey !== "admin" || user.rights !== "full") {
        return <Navigate to={appPaths.home(locale)} replace />;
    }

    return <MenuEditorContent key={user.userId} />;
};

const MenuEditorContent = () => {
    const [status, setStatus] = useState<LoadingStatus>({
        status: "loading",
    });
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        let active = true;

        const loadMenu = async () => {
            try {
                const response = await menu.getManageableMenu();
                if (!active) return;
                setStatus({
                    status: "ready",
                    items: response.data,
                });
            } catch (error) {
                if (!active) return;
                const message = apiMessage(error);
                toast.error(message);
                setStatus({ status: "error", message });
            }
        };

        void loadMenu();
        return () => {
            active = false;
        };
    }, [requestVersion]);

    const retryMenu = () => {
        setStatus({ status: "loading" });
        setRequestVersion((version) => version + 1);
    };

    return (
        <div>
            <h1>Редактор меню</h1>
            {status.status === "loading" && (
                <PageLoader label="Загрузка меню" />
            )}
            {status.status === "error" && (
                <div>
                    <p role="alert">{status.message}</p>
                    <Button onClick={retryMenu}>Повторить</Button>
                </div>
            )}
            {status.status === "ready" && (
                status.items.length === 0 ? (
                    <div>
                        <p>Меню пока не настроено</p>
                        <Button disabled>Создать первый пункт</Button>
                        <p>Создание пунктов появится на следующем этапе.</p>
                    </div>
                ) : (
                    <p>Загружено пунктов: {status.items.length}</p>
                )
            )}
        </div>
    );
};

export default MenuEditorPage;
