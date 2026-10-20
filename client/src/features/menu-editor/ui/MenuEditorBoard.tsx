import { useEffect, useMemo, useRef, useState } from "react";
import { Background, BackgroundVariant, Controls, MiniMap, Panel, ReactFlow, type NodeTypes, type OnNodeDrag, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildEditorGraph } from "../model/build-editor-graph";
import type { EditableMenuNode, EditableVirtualMenuItem, MenuEditorSelection } from "../model/menu-editor-tree.types";
import type { MenuBoardNode, MenuDragState } from "../model/menu-editor-graph.types";
import { MenuEditorNode } from "./MenuEditorNode";
import type { ManageableMenuItemDto } from "../../../shared/api/menu/menu.types";
import { getMenuSubtreeIds } from "../model/get-menu-subtree-ids";
import { updateNodeMeasurements, type NodeMeasurements } from '../model/node-measurements';
import { buildMenuDragPreview, findMenuDropTarget } from '../model/menu-drag-preview';

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
    const flow = useRef<ReactFlowInstance<MenuBoardNode> | null>(null);
    const graph = useMemo(() => buildEditorGraph(root), [root]);
    const [measuredById, setMeasuredById] = useState<NodeMeasurements>({});
    const targetId = drag?.targetId ?? null;
    const targetPosition = drag?.targetPosition ?? null;
    const draggedRootId = drag?.rootId ?? null;
    const preview = useMemo(() => {
        if (targetId === null || targetPosition === null || draggedRootId === null) return graph;
        return buildMenuDragPreview(items, draggedRootId, targetId, targetPosition);
    }, [graph, items, draggedRootId, targetId, targetPosition]);

    useEffect(() => {
        if (!drag) return;
        const cancel = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setDrag(null);
        };
        window.addEventListener('keydown', cancel);
        return () => window.removeEventListener('keydown', cancel);
    }, [drag]);

    const nodes = useMemo(() => preview.nodes.map((node) => {

        const menuId = node.data.menuId;

        const isDragged =
            drag !== null &&
            typeof menuId === 'number' &&
            drag.subtreeIds.has(menuId);

        let position = node.position;

        if (drag && isDragged && drag.targetId === null) {
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
            className: [
                    isDragged && 'menu-board-node--dragging',
                    node.data.menuId === targetId && 'menu-board-drop-target',
                ].filter(Boolean).join(' '),
            // Сохраняем измерения при создании объектов для превью переноса, иначе React Flow сбрасывает вычисленные границы Handle.
            measured: measuredById[node.id] ?? node.measured,
            selected: node.data.menuId === selectedId,
            data: { ...node.data, onAddChild, isSaving },
            draggable: !node.data.isRoot && !isSaving,
            style: {
                ...node.style,
                opacity: isDragged ? 0.45 : node.style?.opacity,
                zIndex: isDragged ? 10 : undefined,
            },
        }
    }), [preview.nodes, targetId, selectedId, onAddChild, isSaving, drag, measuredById]);

    const getPointerPosition = (event: MouseEvent | TouchEvent) => {
        const pointer = 'touches' in event ? event.touches[0] ?? event.changedTouches[0] : event;
        return pointer && flow.current
            ? flow.current.screenToFlowPosition({ x: pointer.clientX, y: pointer.clientY })
            : null;
    };

    const onNodeDragStart: OnNodeDrag<MenuBoardNode> = (event, node) => {
        const id = node.data.menuId;
        if (typeof id !== "number" || isSaving ) return;
        const pointer = getPointerPosition(event);
        if (!pointer) return;

        setDrag({
            rootId: id,
            subtreeIds: getMenuSubtreeIds(items, id),
            startPosition: { ...node.position },
            currentPosition: { ...node.position },
            pointerOffset: { x: pointer.x - node.position.x, y: pointer.y - node.position.y },
            targetId: null,
            targetPosition: null,
        })
    }

    const onNodeDrag: OnNodeDrag<MenuBoardNode> = (event) => {
        const pointer = getPointerPosition(event);
        if (!pointer) return;
        setDrag((previous) => {
            if (!previous) return null;
            const target = findMenuDropTarget(pointer, nodes, previous.subtreeIds, previous.targetId);
            const sameTarget = target?.data.menuId === previous.targetId;

            return {
                ...previous,
                currentPosition: {
                    x: pointer.x - previous.pointerOffset.x,
                    y: pointer.y - previous.pointerOffset.y,
                },
                targetId: target?.data.menuId ?? null,
                targetPosition: sameTarget ? previous.targetPosition : target ? { ...target.position } : null,
            };
        });
    }

    const onNodeDragStop = () => {
        setDrag(null);
    }

    return (
        <div className={`menu-editor__board ${drag ? 'drag' : ''}`} aria-label="Доска структуры меню">
            <ReactFlow<MenuBoardNode>
                onInit={(instance) => { flow.current = instance; }}
                nodes={nodes}
                edges={preview.edges}
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
                    {drag
                        ? targetId !== null
                            ? 'Предпросмотр нового родителя · Esc — отменить · Изменения пока не сохраняются'
                            : 'Наведите курсор на нового родителя · Esc — отменить'
                        : 'Перетаскивайте фон · Колесо — масштаб · Нажмите пункт для просмотра'}
                </Panel>
            </ReactFlow>
        </div>
    );
}
