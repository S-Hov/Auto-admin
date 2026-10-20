import { useMemo, useState } from "react";
import type { ManageableMenuItemDto, MenuSaveData } from "../../../shared/api/menu/menu.types";
import { buildEditorTree } from "../model/build-editor-tree";
import type { MenuEditorSelection } from "../model/menu-editor-tree.types";
import { MenuEditorBoard } from "./MenuEditorBoard";
import { buildNewMenuItemContext, type NewMenuItemContext } from '../model/build-menu-save-data';
import MenuItemPanel from "./MenuItemPanel";
import "./MenuEditor.css";
import { buildMenuMoveData } from "../model/build-menu-move-data";

export function MenuEditor({
    items,
    onSave,
}: {
    items: readonly ManageableMenuItemDto[];
    onSave: (data: MenuSaveData) => Promise<number>;
}) {
    const [selectedId, setSelectedId] = useState<MenuEditorSelection>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [draft, setDraft] = useState<NewMenuItemContext | null>(null);
    const root = useMemo(() => buildEditorTree(items), [items]);
    const selectedItem = items.find((item) => item.id === selectedId) ?? null;

    const saveItem = async (data: MenuSaveData) => {
        setIsSaving(true);
        try {
            const id = await onSave(data);
            setDraft(null);
            setSelectedId(id);
        }
        finally { setIsSaving(false); }
    };

    const addChild = (id: Exclude<MenuEditorSelection, null>) => {
        if (isSaving) return;
        const parentId = id === 'virtual-root' ? null : id;
        setDraft(buildNewMenuItemContext(items, parentId));
        setSelectedId(id);
    };

    const handleMove = async (rootId: number, targetId: number | 'virtual-root') => {
        if (isSaving) return;
        const data = buildMenuMoveData(items, rootId, targetId);
        if (data) {
            await saveItem(data);
        }
    };

    return (
        <div
            className={`menu-editor ${selectedId && !draft ? "menu-editor--selected" : ""}`}
        >
            <section
                className="menu-editor__structure"
                aria-label="Структура меню"
            >
                <h2>Структура меню</h2>
                {items.length === 0 && (
                    <p>Меню пока не настроено. Нажмите «+» у корневого узла, чтобы добавить первый раздел.</p>
                )}
                <MenuEditorBoard
                    items={items}
                    onMove={handleMove}
                    root={root}
                    selectedId={selectedId}
                    onSelect={(id) => { if (!isSaving) { setDraft(null); setSelectedId(id); } }}
                    onAddChild={addChild}
                    isSaving={isSaving}
                />
            </section>
            {selectedId && (
                <MenuItemPanel
                    key={draft ? `create-${draft.parentId ?? 'root'}` : selectedId}
                    selectedId={selectedId}
                    item={selectedItem}
                    onSave={saveItem}
                    draft={draft}
                    onCancelCreate={() => setDraft(null)}
                />
            )}
        </div>
    );
}
