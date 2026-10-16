import { Icon } from "../../../shared/ui/Icon";
import { Button } from "../../../shared/ui/Button/Button";
import { getIconById, searchIcons, type IconMeta } from "../../../shared/assets/icons-catalog";
import { useState } from "react";
import Modal from "../../../shared/ui/Modal/Modal";
import { Input } from "../../../shared/ui/Input/Input";

import './ControlledIconPicker.css'

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
    const icon = getIconById(value);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [icons, setIcons] = useState<IconMeta[]>(
        icon?.name ? searchIcons(icon.name) : []
    );
    const [search, setSearch] = useState(icon?.name || "");

    const handleSearch = (query: string) => {
        setSearch(query);
        setIcons(searchIcons(query));
    }

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
                <div
                    className="icon-picker__modal__search-form"
                >
                    <Input placeholder="Поиск" value={search} onChange={(e) => handleSearch(e.target.value)}/>
                    {/* <Button type="button" variant="primary">Найти</Button> */}
                </div>
                <div className="icon-picker__modal__catalog">
                    {/* <div className="icon-picker__modal__catalog__header">
                        <i>Всего: </i> <b>78</b>
                    </div> */}
                    <div className="icon-picker__modal__catalog__items">
                        {icons.map((icon) => (
                            <div className="icon-picker__modal__catalog__item">
                                <Button
                                    variant="secondary"
                                    type="button"
                                    className="icon-picker__modal__catalog__select-item"
                                >
                                    <Icon icon={icon.id} />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ControlledIconPicker;
