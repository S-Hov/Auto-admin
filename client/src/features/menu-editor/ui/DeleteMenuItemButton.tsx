import { useRef, useState } from 'react';
import { Button } from '../../../shared/ui/Button/Button';
import Modal from '../../../shared/ui/Modal/Modal';
import { apiMessage } from '../../../shared/i18n/api-message';
import type { ManageableMenuItemDto } from '../../../shared/api/menu/menu.types';

interface DeleteMenuItemButtonProps {
    item: ManageableMenuItemDto;
    hasChildren: boolean;
    disabled: boolean;
    onDelete: (id: number) => Promise<void>;
}

export function DeleteMenuItemButton({ item, hasChildren, disabled, onDelete }: DeleteMenuItemButtonProps) {
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inFlight = useRef(false);

    const close = () => {
        if (!inFlight.current) setOpen(false);
    };
    const confirm = async () => {
        if (inFlight.current || disabled || hasChildren) return;
        inFlight.current = true;
        setPending(true);
        setError(null);
        try {
            await onDelete(item.id);
            setOpen(false);
        } catch (cause) {
            setError(apiMessage(cause));
        } finally {
            inFlight.current = false;
            setPending(false);
        }
    };

    return (
        <div className="menu-editor__delete">
            <Button type="button" variant="danger" disabled={disabled || hasChildren} onClick={() => {
                setError(null);
                setOpen(true);
            }}>Удалить пункт</Button>
            {hasChildren && <p className="menu-editor__delete-hint">Сначала удалите или перенесите дочерние пункты.</p>}
            <Modal open={open} title="Удалить пункт меню?" onClose={close}>
                <div className="menu-editor__delete-confirm" aria-busy={pending}>
                    <p>Пункт «{item.name}» будет удалён из меню. Это действие нельзя отменить.</p>
                    <p>Данные пользовательских таблиц не удаляются.</p>
                    {error && <p className="error-message" role="alert">{error}</p>}
                    <div className="menu-editor__delete-actions">
                        <Button type="button" variant="secondary" disabled={pending} onClick={close} autoFocus>Отмена</Button>
                        <Button type="button" variant="danger" disabled={disabled || hasChildren} isLoading={pending} onClick={() => { void confirm(); }}>Удалить</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
