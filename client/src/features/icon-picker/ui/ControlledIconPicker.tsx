import { Icon } from "../../../shared/ui/Icon";

import './ControlledIconPicker.css'
import { Button } from "../../../shared/ui/Button/Button";
import { getIconById } from "../../../shared/assets/icons-catalog";
import { useState } from "react";
import Modal from "../../../shared/ui/Modal/Modal";

interface IconPickerProps {
    value: string | null;
    onChoose: () => void;
    disabled?: boolean;
}

const ControlledIconPicker = ({
    value,
    onChoose,
    disabled = false,
}: IconPickerProps) => {
    const icon = getIconById(value);
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="icon-picker">
            <label>
                Иконка
            </label>
            <Button
                variant="secondary"
                onClick={() => setIsModalOpen(true)}
                disabled={disabled}
                type="button"
                className="icon-picker__open-modal"
            >
                <span className="icon-picker__preview">
                    {icon?.id ? <Icon icon={icon.id} className="icon-picker__icon" /> : "-"}
                </span>
                <span className="icon-picker__name">
                    {icon?.name || "Не выбрано"}
                </span>
            </Button>
            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Выбрать иконку"
            >
                alo
            </Modal>
        </div>
    );
};

export default ControlledIconPicker;
