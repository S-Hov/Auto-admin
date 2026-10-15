import dagre from "@dagrejs/dagre";
import type { EditableMenuNode, EditableVirtualMenuItem } from "./menu-editor-tree.types";
import { MENU_NODE_HEIGHT, MENU_NODE_WIDTH, type MenuEditorGraph } from "./menu-editor-graph.types";

export function buildEditorGraph(root: EditableVirtualMenuItem): MenuEditorGraph {
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: "LR", nodesep: 36, ranksep: 120, marginx: 40, marginy: 40 });
    const nodes: MenuEditorGraph["nodes"] = [];
    const edges: MenuEditorGraph["edges"] = [];

    const visit = (item: EditableMenuNode) => {
        const id = String(item.id);
        const isRoot = item.kind === "root";
        graph.setNode(id, { width: MENU_NODE_WIDTH, height: MENU_NODE_HEIGHT });
        nodes.push({
            id,
            type: "menuItem",
            position: { x: 0, y: 0 },
            width: MENU_NODE_WIDTH,
            height: MENU_NODE_HEIGHT,
            ariaLabel: `${isRoot ? "Меню" : item.name}${!isRoot && !item.isActive ? ", отключён" : ""}`,
            data: {
                menuId: item.id,
                name: isRoot ? "Меню" : item.name,
                icon: isRoot ? "content-management-tree" : item.icon,
                iconType: isRoot ? "icon" : item.iconType,
                isActive: isRoot || item.isActive,
                isRoot,
                childCount: item.children.length,
            },
        });
        for (const child of item.children) {
            visit(child);
            const childId = String(child.id);
            graph.setEdge(id, childId);
            edges.push({ id: `${id}->${childId}`, source: id, target: childId, type: "smoothstep", selectable: false });
        }
    };

    visit(root);
    dagre.layout(graph);
    for (const node of nodes) {
        const position = graph.node(node.id);
        // Dagre returns centres; React Flow expects the top-left corner.
        node.position = { x: position.x - MENU_NODE_WIDTH / 2, y: position.y - MENU_NODE_HEIGHT / 2 };
    }
    return { nodes, edges };
}
