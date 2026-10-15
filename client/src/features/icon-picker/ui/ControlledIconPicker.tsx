import { useForm } from "react-hook-form";
import { ControlledInput } from "../../../shared/form/ControlledInput/ControlledInput";
import {
    type ControlledIconPickerFormValues,
    ControlledIconPickerSchema,
} from "../model/ControlledIconPicker.schema";
import { zodResolver } from "@hookform/resolvers/zod";

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
    const { control } = useForm<ControlledIconPickerFormValues>({
        resolver: zodResolver(ControlledIconPickerSchema),
        defaultValues: {
            icon: value,
        },
    });

    return (
        <div className="icon-picker">
            <ControlledInput
                control={control}
                name="icon"
                label="Выберите иконку"
                placeholder="Выберите иконку"
                type="text"
                defaultValue={value}
                disabled={disabled}
                showLabel={false}
            />
        </div>
    );
};

export default ControlledIconPicker;
