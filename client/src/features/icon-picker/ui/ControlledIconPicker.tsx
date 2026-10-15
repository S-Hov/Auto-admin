import { Icon } from "../../../shared/ui/Icon";

import './ControlledIconPicker.css'
import { Button } from "../../../shared/ui/Button/Button";
import { getIconById } from "../../../shared/assets/icons-catalog";

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

    return (
        <div className="icon-picker">
            <div className="icon-picker__preview">
                {icon?.id ? <Icon icon={icon.id} className="icon-picker__icon" /> : "-"}
            </div>
            <span className="icon-picker__name">
                {icon?.name || "Не выбрано"}
            </span>
            <Button
                variant="secondary"
                onClick={onChoose}
                disabled={disabled}
                type="button"
            >
                Выбрать иконку
            </Button>
        </div>
    );
};

export default ControlledIconPicker;
