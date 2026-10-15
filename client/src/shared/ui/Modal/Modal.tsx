import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "../Button/Button";
import "./Modal.css";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    hideHeader?: boolean;
}

const Modal = ({ open, onClose, title, children, hideHeader = false }: ModalProps) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    const onclick = (event: React.MouseEvent<HTMLDialogElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            onClose();
        }
    }

    return (
        <dialog
            className={`modal${hideHeader ? ' modal--without-header' : ''}`}
            ref={dialogRef}
            aria-labelledby={hideHeader ? undefined : titleId}
            aria-label={hideHeader ? title : undefined}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClick={onclick}
        >
            {!hideHeader && <header className="modal__header">
                <h2 id={titleId} className="modal__title">{title}</h2>
                <Button className="modal__close" variant="secondary" onClick={onClose} type="button" aria-label="Закрыть окно">
                    <span aria-hidden="true">×</span>
                </Button>
            </header>}
            {hideHeader && <Button className="modal__close modal__close--floating" variant="secondary" onClick={onClose} type="button" aria-label="Закрыть окно">
                <span aria-hidden="true">×</span>
            </Button>}
            <div className="modal__body">{children}</div>
        </dialog>
    );
};

export default Modal;
