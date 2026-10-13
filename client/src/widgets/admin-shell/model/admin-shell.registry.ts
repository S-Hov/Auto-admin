import type { AdminShellVariantDefinition } from "./admin-shell.types";
import SideBarLayout from "../ui/variants/sidebar/SidebarLayout";
import GooeyLayout from '../ui/variants/gooey/GooeyLayout';
import TopbarLayout from '../ui/variants/topbar/TopbarLayout';

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


