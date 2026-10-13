import type { AdminShellVariantDefinition } from "./admin-shell.types";
import SideBarLayout from "../ui/variants/sidebar/SidebarLayout";
import GooeyLayout from '../ui/variants/gooey/GooeyLayout';

export const defaultAdminShellVariant: AdminShellVariantDefinition = {
    id: "sidebar",
    label: "Боковое меню",
    component: SideBarLayout,
};

export const AdminShellVariants: AdminShellVariantDefinition[] = [
    defaultAdminShellVariant,
    { id: 'gooey', label: 'Всплывающее меню', component: GooeyLayout },
];


