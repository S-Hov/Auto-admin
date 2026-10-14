import { useEffect, useState, type ReactNode } from "react";
import {
    AdminShellVariants,
    defaultAdminShellVariant,
} from "../model/admin-shell.registry";
import type { AdminShellVariantId, MenuState } from "../model/admin-shell.types";
import { menu } from '../../../shared/api/menu';
import { buildMenuTree } from '../model/build-menu-tree';
import { useAuth } from '../../../app/providers/auth/AuthContext';

import "./AdminShell.css";

interface AdminShellProps {
    children: ReactNode;
}

// При смене пользователя key сбрасывает меню и отменяет обновление старого запроса.
const AdminShell = ({ children }: AdminShellProps) => {
    const { user } = useAuth();
    if (!user) return null;
    return <AuthenticatedShell key={user.userId}>{children}</AuthenticatedShell>;
};

const AuthenticatedShell = ({ children }: AdminShellProps) => {
    const [selectedModel, setSelectedModel] = useState<AdminShellVariantId>('gooey');
    const [menuState, setMenuState] = useState<MenuState>({ status: 'loading' });
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        let active = true;
        async function loadMenu() {
            try {
                const response = await menu.getMenu();
                const items = buildMenuTree(response.data);
                if (active) setMenuState({ status: 'ready', items });
            } catch {
                if (active) setMenuState({ status: 'error', message: 'Не удалось загрузить меню' });
            }
        }
        void loadMenu();
        return () => { active = false; };
    }, [requestVersion]);

    const retryMenu = () => {
        setMenuState({ status: 'loading' });
        setRequestVersion((version) => version + 1);
    };

    let model = AdminShellVariants.find((mod) => mod.id === selectedModel);
    if (!model) {
        model = defaultAdminShellVariant;
    }

    return <>
        <model.component menuState={menuState} onRetryMenu={retryMenu}>{children}</model.component>
        <label className="admin-shell-variant-picker">
            <span>Вид меню</span>
            <select value={selectedModel} onChange={(event) => {
                const variant = AdminShellVariants.find((item) => item.id === event.target.value);
                if (variant) setSelectedModel(variant.id);
            }}>
                {AdminShellVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
            </select>
        </label>
    </>;
};

export default AdminShell;
