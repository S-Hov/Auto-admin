import type { ComponentType, ReactNode } from "react";
import type { VisibleMenuItemDto } from "@auto-admin/contracts/menu";

export type AdminShellVariantId = 'sidebar' | 'gooey' | 'topbar';

export interface AdminShellVariantProps {
    children: ReactNode;
    menuState: MenuState;
    onRetryMenu: () => void;
}

export interface MenuNode extends VisibleMenuItemDto {
    children: MenuNode[];
}

export type MenuState =
    | { status: 'loading' }
    | { status: 'ready'; items: MenuNode[] }
    | { status: 'error'; message: string };

export interface AdminShellVariantDefinition {
    id: AdminShellVariantId;
    label: string;
    component: ComponentType<AdminShellVariantProps>;
}
