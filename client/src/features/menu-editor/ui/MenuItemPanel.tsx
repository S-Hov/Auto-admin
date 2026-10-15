import type { ManageableMenuItemDto } from "../../../shared/api/menu/menu.types";
import type { MenuEditorSelection } from "../model/menu-editor-tree.types";

interface MenuItemPanelProps {
    selectedId: MenuEditorSelection;
    item: ManageableMenuItemDto | null;
}

const MenuItemPanel = ({ selectedId, item }: MenuItemPanelProps) => {
    return (
        <aside className="menu-editor__panel" aria-label="Свойства пункта">
            <h2>Свойства пункта</h2>
            {selectedId === "virtual-root" ? (
                <p>Корневой уровень меню. Здесь будут создаваться основные разделы.</p>
            ) : item ? (
                <dl className="menu-editor__properties">
                    <dt>Название</dt><dd>{item.name}</dd>
                    <dt>Slug</dt><dd>{item.slug}</dd>
                    <dt>ID родителя</dt><dd>{item.parentId ?? "Корневой уровень"}</dd>
                    <dt>Активность</dt><dd>{item.isActive ? "Включён" : "Отключён"}</dd>
                </dl>
            ) : <p>Выберите пункт меню</p>}
        </aside>
    );
};
export default MenuItemPanel;
