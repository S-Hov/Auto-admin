import { Icon } from "../../../shared/ui/Icon";
import { Button } from "../../../shared/ui/Button/Button";
import { getIconById, searchIcons } from "../../../shared/assets/icons-catalog";
import { useState } from "react";
import Modal from "../../../shared/ui/Modal/Modal";
import { Input } from "../../../shared/ui/Input/Input";

import "./ControlledIconPicker.css";

interface IconPickerProps {
    value: string | null;
    onChange: (value: string | null) => void;
    disabled?: boolean;
}

const ControlledIconPicker = ({
    value,
    onChange,
    disabled = false,
}: IconPickerProps) => {
    const icon = getIconById(value ?? "");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState("");
    const icons = searchIcons(search);

    const handleSearch = (query: string) => {
        setSearch(query);
    };

    const closeModal = () => {
        setSearch("");
        setIsModalOpen(false);
    };

    return (
        <div className="icon-picker">
            <label>Иконка</label>
            <Button
                variant="secondary"
                onClick={() => setIsModalOpen(true)}
                disabled={disabled}
                type="button"
                className="icon-picker__open-modal"
            >
                <span className="icon-picker__preview">
                    {icon?.id ? (
                        <Icon icon={icon.id} className="icon-picker__icon" />
                    ) : (
                        "-"
                    )}
                </span>
                <span className="icon-picker__name">
                    {icon?.name || "Не выбрано"}
                </span>
            </Button>
            <Modal open={isModalOpen} onClose={closeModal} title="Выбрать иконку">
                <div className="icon-picker__modal__search-form">
                    <Input
                        id="icon-search"
                        placeholder="Поиск"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        aria-label="Поиск иконок"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") e.preventDefault();
                        }}
                    />
                </div>
                <div className="icon-picker__modal__catalog">
                    <div className="icon-picker__modal__catalog__items">
                        {icons.length === 0 ? (
                            <p>Ничего не найдено. Попробуйте другой запрос.</p>
                        ) : (
                            icons.map((icon) => (
                                <div
                                    className="icon-picker__modal__catalog__item"
                                    key={icon.id}
                                >
                                    <Button
                                        variant="secondary"
                                        type="button"
                                        className="icon-picker__modal__catalog__select-item"
                                        title={icon.name}
                                        aria-label={icon.name}
                                        key={`${icon.id}-${icon.name}`}
                                        onClick={() => {
                                            onChange(icon.id);
                                            closeModal();
                                        }}
                                    >
                                        <Icon icon={icon.id} />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ControlledIconPicker;
