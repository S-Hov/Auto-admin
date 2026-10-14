import type { ManageableMenuItemDto } from "../../../shared/api/menu/menu.types";

export interface EditableMenuItemDto extends ManageableMenuItemDto {
    kind: "item";
    children: EditableMenuItemDto[];
}

export interface EditableVirtualMenuItem {
    kind: "root";
    id: "virtual-root";
    name: string;
    children: EditableMenuItemDto[];
}