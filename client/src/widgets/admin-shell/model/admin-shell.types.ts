import type { ComponentType, ReactNode } from "react";
import type { MenuItemDto } from '../../../shared/api/menu/menu.types';

export type AdminShellVariantId = 'sidebar';

export interface AdminShellVariantProps {
    children: ReactNode;
    menuState: MenuState;
    onRetryMenu: () => void;
}

export interface MenuNode extends MenuItemDto {
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
