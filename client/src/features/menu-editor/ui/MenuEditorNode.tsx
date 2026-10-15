import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MenuBoardNode } from "../model/menu-editor-graph.types";
import { MenuIcon } from "../../../widgets/admin-shell/ui/MenuIcon";

export function MenuEditorNode({ data, selected }: NodeProps<MenuBoardNode>) {
    return (
        <div className={`menu-board-node${selected ? " menu-board-node--selected" : ""}${!data.isActive ? " menu-board-node--inactive" : ""}`}>
            {!data.isRoot && <Handle type="target" position={Position.Left} isConnectable={false} />}
            <div className="menu-board-node__circle">
                {data.iconType === "icon" || !data.icon ? (
                    <MenuIcon icon={data.icon} className="menu-board-node__icon" />
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
        </div>
    );
}
