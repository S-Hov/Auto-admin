import type { AdminShellVariantDefinition } from "./admin-shell.types";
import SideBarLayout from "../variants/sidebar/ui/SidebarLayout";
import GooeyLayout from '../variants/gooey/ui/GooeyLayout';
import TopbarLayout from '../variants/topbar/ui/TopbarLayout';

export const defaultAdminShellVariant: AdminShellVariantDefinition = {
    id: "sidebar",
    label: "Боковое меню",
    component: SideBarLayout,
};

export const AdminShellVariants: AdminShellVariantDefinition[] = [
    defaultAdminShellVariant,
    { id: 'gooey', label: 'Всплывающее меню', component: GooeyLayout },
    { id: 'topbar', label: 'Верхнее меню', component: TopbarLayout },
];


