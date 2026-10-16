import { useMemo, useState } from "react";
import type { ManageableMenuItemDto } from "../../../shared/api/menu/menu.types";
import { buildEditorTree } from "../model/build-editor-tree";
import type { MenuEditorSelection } from "../model/menu-editor-tree.types";
import { MenuEditorBoard } from "./MenuEditorBoard";
import MenuItemPanel from "./MenuItemPanel";
import "./MenuEditor.css";

export function MenuEditor({
    items,
}: {
    items: readonly ManageableMenuItemDto[];
}) {
    const [selectedId, setSelectedId] = useState<MenuEditorSelection>(null);
    const root = useMemo(() => buildEditorTree(items), [items]);
    const selectedItem = items.find((item) => item.id === selectedId) ?? null;

    return (
        <div
            className={`menu-editor ${selectedId ? "menu-editor--selected" : ""}`}
        >
            <section
                className="menu-editor__structure"
                aria-label="Структура меню"
            >
                <h2>Структура меню</h2>
                {items.length === 0 && (
                    <p>Меню пока не настроено. Выберите корневой узел.</p>
                )}
                <MenuEditorBoard
                    root={root}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                />
            </section>
            {selectedId && (
                <MenuItemPanel
                    key={selectedId}
                    selectedId={selectedId}
                    item={selectedItem}
                />
            )}
        </div>
    );
}
