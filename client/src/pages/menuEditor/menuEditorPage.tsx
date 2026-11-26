import { useEffect, useState } from "react";
import type { ManageableMenuItemDto, MenuSaveData } from "@auto-admin/contracts/menu";
import { menu } from "../../shared/api/menu";
import { toast } from "sonner";
import { apiMessage } from "../../shared/i18n/api-message";
import { useAuth } from "../../app/providers/auth/AuthContext";
import { AccessDenied } from "../../app/routing/guards/AccessDenied";
import { Button } from "../../shared/ui/Button/Button";
import { PageLoader } from "../../shared/ui/Loader";
import { MenuEditor } from "../../features/menu-editor/ui/MenuEditor";
import { buildEditorTree } from "../../features/menu-editor/model/build-editor-tree";
import { useMenuRefresh } from "../../app/providers/menu/MenuRefreshContext";
import { upsertSavedMenuItem } from "../../features/menu-editor/model/build-menu-save-data";
import { StatusPanel } from '../../shared/ui/StatusPanel/StatusPanel';
import { getErrorVariant } from '../../shared/ui/StatusPanel/get-error-variant';
import type { RaccoonVariant } from '../../shared/ui/Raccoon/Raccoon';

interface StatusLoading {
    status: "loading";
}

interface StatusError {
    status: "error";
    message: string;
    variant: RaccoonVariant;
}

interface StatusReady {
    status: "ready";
    items: ManageableMenuItemDto[];
}

type LoadingStatus = StatusLoading | StatusError | StatusReady;

const MenuEditorPage = () => {
    const { user } = useAuth();
    if (!user || user.roleKey !== "admin" || user.rights !== "full") {
        return <AccessDenied />;
    }

    return <MenuEditorContent key={user.userId} />;
};

const MenuEditorContent = () => {
    const refreshNavigation = useMenuRefresh();
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
                buildEditorTree(response.data);
                setStatus({
                    status: "ready",
                    items: response.data,
                });
            } catch (error) {
                if (!active) return;
                const message = apiMessage(error);
                toast.error(message);
                setStatus({ status: "error", message, variant: getErrorVariant(error) });
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

    const saveItem = async (data: MenuSaveData): Promise<number> => {
        const responsePromise = menu.saveMenu(data);

        const response = await toast
            .promise(responsePromise, {
                loading: "Идёт сохранение",
                success: "Изменения сохранены",
                error: (err) => apiMessage(err),
            }).unwrap();

        setStatus((current) =>
            current.status !== "ready"
                ? current
                : {
                      status: "ready",
                      items: upsertSavedMenuItem(
                          current.items,
                          data,
                          response.data.id,
                      ),
                  },
        );

        refreshNavigation();

        return response.data.id;
    };

    const deleteItem = async (id: number): Promise<void> => {
        await toast.promise(menu.deleteMenu(id), {
            loading: 'Удаляем пункт меню…',
            success: 'Пункт меню удалён',
            error: (error) => apiMessage(error),
        }).unwrap();

        setStatus((current) => current.status !== 'ready' ? current : {
            ...current,
            items: current.items.filter((item) => item.id !== id),
        });
        refreshNavigation();
    };

    return (
        <div className="menu-editor-page">
            {status.status === "loading" && (
                <PageLoader label="Загрузка меню" />
            )}
            {status.status === "error" && (
                <StatusPanel variant={status.variant} title={status.message} role="alert">
                    <Button onClick={retryMenu}>Повторить</Button>
                </StatusPanel>
            )}
            {status.status === "ready" && (
                <MenuEditor items={status.items} onSave={saveItem} onDelete={deleteItem} />
            )}
        </div>
    );
};

export default MenuEditorPage;
