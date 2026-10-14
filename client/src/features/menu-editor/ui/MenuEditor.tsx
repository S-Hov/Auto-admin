import { useState } from "react";
import type { ManageableMenuItemDto } from "../../../shared/api/menu/menu.types";
import { buildEditorTree } from "../model/build-editor-tree";
import type { MenuEditorSelection } from "../model/menu-editor-tree.types";
import { MenuEditorTree } from "./MenuEditorTree";
import MenuItemPanel from "./MenuItemPanel";
import "./MenuEditor.css";

export function MenuEditor({ items }: { items: readonly ManageableMenuItemDto[] }) {
    const [selectedId, setSelectedId] = useState<MenuEditorSelection>(null);
    const root = buildEditorTree(items);
    const selectedItem = items.find((item) => item.id === selectedId) ?? null;

    return (
        <div className="menu-editor">
            <section className="menu-editor__structure" aria-label="Структура меню">
                <h2>Структура меню</h2>
                {items.length === 0 && <p>Меню пока не настроено. Выберите корневой узел.</p>}
                <MenuEditorTree root={root} selectedId={selectedId} onSelect={setSelectedId} />
            </section>
            <MenuItemPanel selectedId={selectedId} item={selectedItem} />
        </div>
    );
}
