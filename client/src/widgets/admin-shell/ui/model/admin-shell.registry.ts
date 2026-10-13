import type { AdminShellVariantDefinition } from "./admin-shell.types";
import SideBarLayout from "./sidebar/SidebarLayout";

export const AdminShellVariants: AdminShellVariantDefinition[] = [
    {
        id: 'sidebar',
        label: 'Боковое меню',
        component: SideBarLayout,
    }
]