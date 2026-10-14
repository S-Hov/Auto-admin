import type { ManageableMenuItemDto } from "../../../shared/api/menu/menu.types";

export interface EditableMenuItemDto extends ManageableMenuItemDto {
    kind: "item";
    children: EditableMenuItemDto[];
}

export interface EditableVirtualMenuItem extends Omit<ManageableMenuItemDto, "id" | "name" | "parentId"> {
    kind: "root";
    id: "virtual-root";
    name: "Menu";
    children: EditableMenuItemDto[];
}