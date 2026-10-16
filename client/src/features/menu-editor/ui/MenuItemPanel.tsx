import { Controller, useForm } from "react-hook-form";
import type { ManageableMenuItemDto } from "../../../shared/api/menu/menu.types";
import { ControlledInput } from "../../../shared/form/ControlledInput/ControlledInput";
import type { MenuEditorSelection } from "../model/menu-editor-tree.types";
import {
    menuItemPanelSchema,
    type MenuItemPanelFormValues,
} from "../model/MenuItemPanel.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../../../shared/ui/Button/Button";
import ControlledIconPicker from "../../icon-picker/ui/ControlledIconPicker";

interface MenuItemPanelProps {
    selectedId: MenuEditorSelection;
    item: ManageableMenuItemDto | null;
}

const MenuItemPanel = ({ selectedId, item }: MenuItemPanelProps) => {
    const { control } = useForm<MenuItemPanelFormValues>({
        resolver: zodResolver(menuItemPanelSchema),
        defaultValues: {
            name: item?.name ?? "",
            icon: item?.icon ?? null,
            slug: item?.slug ?? "",
            parentId: item?.parentId != null ? String(item.parentId) : "",
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
                        name="name"
                        label="Название"
                        placeholder="Название"
                        type="text"
                    />
                    <ControlledInput
                        control={control}
                        name="slug"
                        label="Slug/URL"
                        placeholder="slug-url"
                        type="text"
                    />
                    {item.parentId === null ? (
                        <ControlledInput
                            control={control}
                            name="parentId"
                            label="Родительский раздел (меняется на доске)"
                            placeholder="Корневой раздел"
                            type="text"
                            disabled={true}
                            defaultValue=""
                        />
                    ) : (
                        <ControlledInput
                            control={control}
                            name="parentId"
                            label="Родительский раздел (меняется на доске)"
                            placeholder="Родительский раздел"
                            type="text"
                            disabled={true}
                        />
                    )}
                    <Controller
                        name="icon"
                        control={control}
                        render={({ field }) => (
                            <ControlledIconPicker
                                value={field.value}
                                onChange={field.onChange}
                            />
                        )}
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
