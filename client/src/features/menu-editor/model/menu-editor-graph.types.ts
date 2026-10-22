import type { Edge, Node, XYPosition } from "@xyflow/react";
import type { EditableMenuNode } from "./menu-editor-tree.types";

export type MenuBoardNode = Node<{
    menuId: EditableMenuNode["id"];
    name: string;
    icon: string | null;
    iconType: "icon" | "svg" | "image" | "video";
    isActive: boolean;
    isRoot: boolean;
    childCount: number;
    onAddChild?: (id: EditableMenuNode['id']) => void;
    isSaving?: boolean;
}, "menuItem">;

export interface MenuEditorGraph {
    nodes: MenuBoardNode[];
    edges: Edge[];
}

export const MENU_NODE_WIDTH = 160;
export const MENU_NODE_HEIGHT = 136;

export interface MenuDragState {
    rootId: number;
    subtreeIds: ReadonlySet<number>;
    startPosition: XYPosition;
    currentPosition: XYPosition;
    pointerOffset: XYPosition;
    targetId: number | 'virtual-root' | null;
    targetPosition: XYPosition | null;
}
