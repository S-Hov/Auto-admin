import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MenuBoardNode } from "../model/menu-editor-graph.types";
import { Icon } from "../../../shared/ui/Icon";
import { Button } from "../../../shared/ui/Button/Button";

export function MenuEditorNode({ data, selected }: NodeProps<MenuBoardNode>) {
    return (
        <div className={`menu-board-node${selected ? " menu-board-node--selected" : ""}${!data.isActive ? " menu-board-node--inactive" : ""}`}>
            {!data.isRoot && <Handle type="target" position={Position.Left} isConnectable={false} />}
            <div className="menu-board-node__circle">
                {data.iconType === "icon" || !data.icon ? (
                    <Icon icon={data.icon} className="menu-board-node__icon" />
                ) : data.iconType === "video" ? (
                    <video src={data.icon} muted playsInline preload="none" className="menu-board-node__media" />
                ) : (
                    <img src={data.icon} alt="" draggable={false} className="menu-board-node__media" />
                )}
                {data.childCount > 0 && <span className="menu-board-node__count" title="Дочерние пункты">{data.childCount}</span>}
            </div>
            <span className="menu-board-node__name" title={data.name}>{data.name}</span>
            {!data.isActive && <span className="menu-board-node__status">Отключён</span>}
            <Handle type="source" position={Position.Right} isConnectable={false} />

            <Button className="menu-board-node__add-child-btn">
                <svg xmlns="http://w3.org" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </Button>
        </div>
    );
}
