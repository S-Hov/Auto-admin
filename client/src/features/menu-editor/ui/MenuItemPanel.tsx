import { useId, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import type { ManageableMenuItemDto, MenuSaveData } from "../../../shared/api/menu/menu.types";
import { ControlledInput } from "../../../shared/form/ControlledInput/ControlledInput";
import type { MenuEditorSelection } from "../model/menu-editor-tree.types";
import { menuItemPanelSchema, type MenuItemPanelFormValues } from "../model/MenuItemPanel.schema";
import { buildMenuSaveData } from "../model/build-menu-save-data";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../../../shared/ui/Button/Button";
import { Input } from "../../../shared/ui/Input/Input";
import ControlledIconPicker from "../../icon-picker/ui/ControlledIconPicker";
import { toast } from "sonner";
import { apiMessage } from "../../../shared/i18n/api-message";
import { applyFieldErrors } from "../../../shared/api/apply-field-errors";

interface MenuItemPanelProps {
    selectedId: MenuEditorSelection;
    item: ManageableMenuItemDto | null;
    onSave: (data: MenuSaveData) => Promise<void>;
}

const MenuItemPanel = ({ selectedId, item, onSave }: MenuItemPanelProps) => {
    const parentFieldId = useId();
    const saveInFlight = useRef(false);
    const {
        control, handleSubmit, setError, clearErrors, reset,
        formState: { isSubmitting, isDirty, errors },
    } = useForm<MenuItemPanelFormValues>({
        resolver: zodResolver(menuItemPanelSchema),
        defaultValues: {
            name: item?.name ?? "",
            icon: item?.icon ?? null,
            slug: item?.slug ?? "",
        },
    });

    const submit = async (values: MenuItemPanelFormValues) => {
        if (!item || saveInFlight.current) return;
        saveInFlight.current = true;
        clearErrors('root.server');
        try {
            const payload = buildMenuSaveData(item, values);
            await toast.promise(onSave(payload), {
                loading: 'Сохраняем пункт меню...',
                success: 'Изменения сохранены',
                error: (error) => apiMessage(error),
            }).unwrap();
            reset(values);
        } catch (error) {
            if (!applyFieldErrors(error, setError, ['name', 'slug', 'icon'])) {
                setError('root.server', { type: 'server', message: apiMessage(error) });
            }
        } finally {
            saveInFlight.current = false;
        }
    };

    return (
        <aside className="menu-editor__panel" aria-label="Свойства пункта">
            <h2>Свойства пункта{item?.name ? `: ${item.name}` : ""}</h2>
            {selectedId === "virtual-root" ? (
                <p>Корневой уровень меню. Здесь будут создаваться основные разделы.</p>
            ) : item ? (
                <form className="menu-editor__properties" onSubmit={(event) => { void handleSubmit(submit)(event); }} noValidate aria-busy={isSubmitting}>
                    <fieldset className="menu-editor__fields" disabled={isSubmitting}>
                        <ControlledInput control={control} name="name" label="Название" placeholder="Название" type="text" />
                        <ControlledInput control={control} name="slug" label="Slug/URL" placeholder="slug-url" type="text" />
                        <div className="field-group">
                            <label htmlFor={parentFieldId}>Родительский раздел</label>
                            <Input id={parentFieldId} value={item.parentId ?? ""} placeholder="Корневой раздел" readOnly disabled />
                        </div>
                        <Controller
                            name="icon"
                            control={control}
                            render={({ field, fieldState }) => (
                                <div>
                                    <ControlledIconPicker value={field.value} onChange={field.onChange} disabled={isSubmitting} />
                                    {fieldState.error && <p className="error-message" role="alert">{fieldState.error.message}</p>}
                                </div>
                            )}
                        />
                        {errors.root?.server && <p className="error-message" role="alert">{errors.root.server.message}</p>}
                        <Button type="submit" variant="primary" className="check-button w-100__percent" disabled={!isDirty || isSubmitting} isLoading={isSubmitting}>
                            Сохранить изменения
                        </Button>
                    </fieldset>
                </form>
            ) : <p>Выберите пункт меню</p>}
        </aside>
    );
};
export default MenuItemPanel;
