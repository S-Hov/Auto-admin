import type { ReactNode } from "react";

import "./AdminShell.css";
import { AdminShellVariants } from "./model/admin-shell.registry";
import { toast } from "sonner";
import SideBarLayout from "./model/sidebar/SidebarLayout";

interface AdminShellProps {
    children: ReactNode;
}

const AdminShell = ({ children }: AdminShellProps) => {
    const selectedModel = 'sidebar';

    let model = AdminShellVariants.find((mod) => mod.id === selectedModel);
    if(!model) {
        toast.error('Выбранное меню не найдено, будет применён стандартный вариант');
        model = {
            id: 'sidebar',
            label: '',
            component: SideBarLayout,
        }
    }

    return (
        <model.component>
            {children}
        </model.component>
    );
};

export default AdminShell;
