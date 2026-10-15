import { useForm } from "react-hook-form";
import type { ManageableMenuItemDto } from "../../../shared/api/menu/menu.types";
import { ControlledInput } from "../../../shared/form/ControlledInput/ControlledInput";
import type { MenuEditorSelection } from "../model/menu-editor-tree.types";
import {
    menuItemPanelSchema,
    type MenuItemPanelFormValues,
} from "../model/MenuItemPanel.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../../../shared/ui/Button/Button";

interface MenuItemPanelProps {
    selectedId: MenuEditorSelection;
    item: ManageableMenuItemDto | null;
}

const MenuItemPanel = ({ selectedId, item }: MenuItemPanelProps) => {
    const { control } = useForm<MenuItemPanelFormValues>({
        resolver: zodResolver(menuItemPanelSchema),
        defaultValues: {
            name: item?.name ?? "",
        },
    });

    return (
        <aside className="menu-editor__panel" aria-label="Свойства пункта">
            <h2>Свойства пункта{item?.name ? `: ${item.name}` : ""}</h2>
            {selectedId === "virtual-root" ? (
                <p>
                    Корневой уровень меню. Здесь будут создаваться основные
                    разделы.
                </p>
            ) : item ? (
                <form className="menu-editor__properties">
                    <ControlledInput
                        control={control}
                        key={item.name}
                        name="name"
                        label="Название"
                        placeholder="Название"
                        type="text"
                        defaultValue={item.name}
                    />
                    <ControlledInput
                        control={control}
                        key={item.slug}
                        name="slug"
                        label="Slug/URL"
                        placeholder="slug-url"
                        type="text"
                        defaultValue={item.slug}
                    />
                    <ControlledInput
                        control={control}
                        key={item.parentId}
                        name="parentId"
                        label="Родительский раздел (меняется на доске)"
                        placeholder="Родительский раздел"
                        type="text"
                        defaultValue={item.parentId ?? "Корневой уровень меню"}
                        disabled={true}
                    />

                    <Button
                        type="button"
                        variant="primary"
                        className="check-button w-100__percent"
                    >
                        Сохранить изменения
                    </Button>
                </form>
            ) : (
                <p>Выберите пункт меню</p>
            )}
        </aside>
    );
};
export default MenuItemPanel;
