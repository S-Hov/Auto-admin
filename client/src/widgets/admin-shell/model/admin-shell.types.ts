import type { ComponentType, ReactNode } from "react";

export type AdminShellVariantId = 'sidebar';

export interface AdminShellVariantProps {
    children: ReactNode;
}

export interface AdminShellVariantDefinition {
    id: AdminShellVariantId;
    label: string;
    component: ComponentType<AdminShellVariantProps>;
}