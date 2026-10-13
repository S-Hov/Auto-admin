import type { AdminShellVariantDefinition } from "./admin-shell.types";
import SideBarLayout from "../ui/variants/sidebar/SidebarLayout";

export const defaultAdminShellVariant: AdminShellVariantDefinition = {
    id: "sidebar",
    label: "Боковое меню",
    component: SideBarLayout,
};

export const AdminShellVariants: AdminShellVariantDefinition[] = [
    defaultAdminShellVariant,
];


