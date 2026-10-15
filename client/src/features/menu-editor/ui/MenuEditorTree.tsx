import { Button } from "../../../shared/ui/Button/Button";
import type { EditableMenuNode, EditableVirtualMenuItem, MenuEditorSelection } from "../model/menu-editor-tree.types";

interface SelectionProps {
    selectedId: MenuEditorSelection;
    onSelect: (id: EditableMenuNode["id"]) => void;
}

function TreeNode({ node, selectedId, onSelect }: SelectionProps & { node: EditableMenuNode }) {
    const selected = node.id === selectedId;
    const inactive = node.kind === "item" && !node.isActive;
    return (
        <li>
            <Button
                type="button"
                variant={selected ? "primary" : "secondary"}
                className={`menu-editor__node${inactive ? " menu-editor__node--inactive" : ""}`}
                aria-pressed={selected}
                onClick={() => onSelect(node.id)}
            >
                {node.kind === "root" ? "Меню" : node.name}
                {inactive && <span className="menu-editor__badge">Отключён</span>}
            </Button>
            {node.children.length > 0 && (
                <ul className="menu-editor__tree-children">
                    {node.children.map((child) => (
                        <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />
                    ))}
                </ul>
            )}
        </li>
    );
}

export function MenuEditorTree({ root, selectedId, onSelect }: SelectionProps & { root: EditableVirtualMenuItem }) {
    return (
        <ul className="menu-editor__tree">
            <TreeNode node={root} selectedId={selectedId} onSelect={onSelect} />
        </ul>
    );
}
