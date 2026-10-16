import { useMemo } from "react";
import { Background, BackgroundVariant, Controls, MiniMap, Panel, ReactFlow, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildEditorGraph } from "../model/build-editor-graph";
import type { EditableMenuNode, EditableVirtualMenuItem, MenuEditorSelection } from "../model/menu-editor-tree.types";
import type { MenuBoardNode } from "../model/menu-editor-graph.types";
import { MenuEditorNode } from "./MenuEditorNode";

const nodeTypes = { menuItem: MenuEditorNode } satisfies NodeTypes;
const fitViewOptions = { padding: 0.15, maxZoom: 1 };

interface MenuEditorBoardProps {
    root: EditableVirtualMenuItem;
    selectedId: MenuEditorSelection;
    onSelect: (id: EditableMenuNode["id"] | null) => void;
    onAddChild: (id: EditableMenuNode['id']) => void;
    isSaving: boolean;
}

export function MenuEditorBoard({ root, selectedId, onSelect, onAddChild, isSaving }: MenuEditorBoardProps) {
    const graph = useMemo(() => buildEditorGraph(root), [root]);
    const nodes = useMemo(() => graph.nodes.map((node) => ({
        ...node,
        selected: node.data.menuId === selectedId,
        data: { ...node.data, onAddChild, isSaving },
    })), [graph.nodes, selectedId, onAddChild, isSaving]);

    return (
        <div className="menu-editor__board" aria-label="Доска структуры меню">
            <ReactFlow<MenuBoardNode>
                nodes={nodes}
                edges={graph.edges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => onSelect(node.data.menuId)}
                onNodesChange={(changes) => {
                    const selection = changes.find((change) => change.type === "select" && change.selected);
                    if (selection?.type === "select") {
                        const node = graph.nodes.find((node) => node.id === selection.id);
                        if (node) onSelect(node.data.menuId);
                    }
                }}
                onPaneClick={() => onSelect(null)}
                nodesDraggable={false}
                nodesConnectable={false}
                edgesReconnectable={false}
                deleteKeyCode={null}
                multiSelectionKeyCode={null}
                minZoom={0.15}
                maxZoom={2}
                fitView
                fitViewOptions={fitViewOptions}
            >
                <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--border-color)" />
                <Controls showInteractive={false} fitViewOptions={fitViewOptions} />
                <MiniMap pannable zoomable nodeColor={(node) => node.selected ? "var(--accent-color)" : "var(--border-color)"} />
                <Panel position="top-left" className="menu-editor__board-hint">
                    Перетаскивайте фон · Колесо — масштаб · Нажмите пункт для просмотра
                </Panel>
            </ReactFlow>
        </div>
    );
}
