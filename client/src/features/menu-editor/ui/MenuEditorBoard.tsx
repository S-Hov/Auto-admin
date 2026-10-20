import { useMemo, useState } from "react";
import { Background, BackgroundVariant, Controls, MiniMap, Panel, ReactFlow, type NodeTypes, type OnNodeDrag } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildEditorGraph } from "../model/build-editor-graph";
import type { EditableMenuNode, EditableVirtualMenuItem, MenuEditorSelection } from "../model/menu-editor-tree.types";
import type { MenuBoardNode, MenuDragState } from "../model/menu-editor-graph.types";
import { MenuEditorNode } from "./MenuEditorNode";
import type { ManageableMenuItemDto } from "../../../shared/api/menu/menu.types";
import { getMenuSubtreeIds } from "../model/get-menu-subtree-ids";
import { updateNodeMeasurements, type NodeMeasurements } from '../model/node-measurements';

const nodeTypes = { menuItem: MenuEditorNode } satisfies NodeTypes;
const fitViewOptions = { padding: 0.15, maxZoom: 1 };

interface MenuEditorBoardProps {
    items: readonly ManageableMenuItemDto[];
    root: EditableVirtualMenuItem;
    selectedId: MenuEditorSelection;
    onSelect: (id: EditableMenuNode["id"] | null) => void;
    onAddChild: (id: EditableMenuNode['id']) => void;
    isSaving: boolean;
}

export function MenuEditorBoard({ items, root, selectedId, onSelect, onAddChild, isSaving }: MenuEditorBoardProps) {
    const [drag, setDrag] = useState<MenuDragState | null>(null);
    const graph = useMemo(() => buildEditorGraph(root), [root]);
    const [measuredById, setMeasuredById] = useState<NodeMeasurements>({});
    const nodes = useMemo(() => graph.nodes.map((node) => {

        const menuId = node.data.menuId;

        const isDragged =
            drag !== null &&
            typeof menuId === 'number' &&
            drag.subtreeIds.has(menuId);

        let position = node.position;

        if (drag && isDragged) {
            const dx = drag.currentPosition.x - drag.startPosition.x
            const dy = drag.currentPosition.y - drag.startPosition.y
            position = {
                x: node.position.x + dx,
                y: node.position.y + dy,
            }
        }

        return {
            ...node,
            position,
            // Сохраняем измерения при создании объектов для превью переноса, иначе React Flow сбрасывает вычисленные границы Handle.
            measured: measuredById[node.id] ?? node.measured,
            selected: node.data.menuId === selectedId,
            data: { ...node.data, onAddChild, isSaving },
            draggable: !node.data.isRoot && !isSaving,
            style: {
                ...node.style,
                opacity: isDragged ? 0.45 : node.style?.opacity,
            },
        }
    }), [graph.nodes, selectedId, onAddChild, isSaving, drag, measuredById]);

    const onNodeDragStart: OnNodeDrag<MenuBoardNode> = (_event, node) => {
        const id = node.data.menuId;
        if (typeof id !== "number" || isSaving ) return;

        setDrag({
            rootId: id,
            subtreeIds: getMenuSubtreeIds(items, id),
            startPosition: { ...node.position },
            currentPosition: { ...node.position },
        })
    }

    const onNodeDrag: OnNodeDrag<MenuBoardNode> = (_event, node) => {
        setDrag((previous) => {
            if (!previous) return null;

            return {
                ...previous,
                currentPosition: { ...node.position },
            };
        });
    }

    const onNodeDragStop = () => {
        setDrag(null);
    }

    return (
        <div className="menu-editor__board" aria-label="Доска структуры меню">
            <ReactFlow<MenuBoardNode>
                nodes={nodes}
                edges={graph.edges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => onSelect(node.data.menuId)}
                onNodesChange={(changes) => {
                    if (changes.some((change) => change.type === 'dimensions' && change.dimensions)) {
                        setMeasuredById((previous) => updateNodeMeasurements(previous, changes));
                    }
                    const selection = changes.find((change) => change.type === "select" && change.selected);
                    if (selection?.type === "select") {
                        const node = graph.nodes.find((node) => node.id === selection.id);
                        if (node) onSelect(node.data.menuId);
                    }
                }}
                onPaneClick={() => onSelect(null)}
                onNodeDragStart={onNodeDragStart}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
                nodesDraggable={!isSaving}
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
