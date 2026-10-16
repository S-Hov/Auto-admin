import { useMemo, useState } from "react";
import type { ManageableMenuItemDto, MenuSaveData } from "../../../shared/api/menu/menu.types";
import { buildEditorTree } from "../model/build-editor-tree";
import type { MenuEditorSelection } from "../model/menu-editor-tree.types";
import { MenuEditorBoard } from "./MenuEditorBoard";
import MenuItemPanel from "./MenuItemPanel";
import "./MenuEditor.css";

export function MenuEditor({
    items,
    onSave,
}: {
    items: readonly ManageableMenuItemDto[];
    onSave: (data: MenuSaveData) => Promise<void>;
}) {
    const [selectedId, setSelectedId] = useState<MenuEditorSelection>(null);
    const [isSaving, setIsSaving] = useState(false);
    const root = useMemo(() => buildEditorTree(items), [items]);
    const selectedItem = items.find((item) => item.id === selectedId) ?? null;

    const saveItem = async (data: MenuSaveData) => {
        setIsSaving(true);
        try { await onSave(data); }
        finally { setIsSaving(false); }
    };

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
                    onSelect={(id) => { if (!isSaving) setSelectedId(id); }}
                />
            </section>
            {selectedId && (
                <MenuItemPanel
                    key={selectedId}
                    selectedId={selectedId}
                    item={selectedItem}
                    onSave={saveItem}
                />
            )}
        </div>
    );
}
