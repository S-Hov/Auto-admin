import { useEffect, useState } from "react";
import type { ManageableMenuItemDto } from "../../shared/api/menu/menu.types";
import { menu } from "../../shared/api/menu";
import { toast } from "sonner";
import { apiMessage } from "../../shared/i18n/api-message";
import { useAuth } from "../../app/providers/auth/AuthContext";
import { Navigate } from "react-router-dom";
import { appPaths } from "../../app/routing/app-paths";
import { useAppLocale } from "../../app/routing/locale/use-app-locale";

interface StatusLoading {
    status: "loading";
}

interface StatusError {
    status: "error";
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
        toast.error("У вас нет прав для доступа к этой странице");
        return <Navigate to={appPaths.home(locale)} />;
    }

    const [status, setStatus] = useState<LoadingStatus>({
        status: "loading",
    });

    const loadMenu = async () => {
        let active = true;
        try {
            const response = await menu.getManageableMenu();
            if (active) {
                setStatus({
                    status: "ready",
                    items: response.data,
                });
            }
        } catch (error) {
            if (!active) return;
            toast.error(apiMessage(error));
            setStatus({
                status: "error",
            });
        }
        active = false;
    };

    useEffect(() => {
        if (status.status === "loading") {
            void loadMenu();
        }
    }, [status.status]);

    return (
        <div>
            <h1>Menu Editor</h1>
        </div>
    );
};

export default MenuEditorPage;
