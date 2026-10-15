import { useForm } from "react-hook-form";
import { ControlledInput } from "../../../shared/form/ControlledInput/ControlledInput";
import {
    type ControlledIconPickerFormValues,
    ControlledIconPickerSchema,
} from "../model/ControlledIconPicker.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "../../../shared/ui/Icon";

import './ControlledIconPicker.css'
import { Button } from "../../../shared/ui/Button/Button";

interface IconPickerProps {
    value: string | null;
    onChoose?: () => void;
    disabled?: boolean;
}

const ControlledIconPicker = ({
    value,
    onChoose,
    disabled = false,
}: IconPickerProps) => {
    const { control } = useForm<ControlledIconPickerFormValues>({
        resolver: zodResolver(ControlledIconPickerSchema),
        defaultValues: {
            icon: value,
        },
    });

    return (
        <div className="icon-picker">
            <div className="icon-picker__preview">
                <Icon icon={value} className="icon-picker__icon" />
            </div>
            <ControlledInput
                control={control}
                name="icon"
                label="Выберите иконку"
                placeholder="Выберите иконку"
                type="text"
                defaultValue={value}
                disabled={true}
                showLabel={false}
            />
            <Button
                variant="secondary"
                onClick={onChoose}
            >
                Выбрать иконку
            </Button>
        </div>
    );
};

export default ControlledIconPicker;
