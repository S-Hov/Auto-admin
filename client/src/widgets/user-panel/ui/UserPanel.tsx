import { useState } from "react";
import { useAuth } from "../../../app/providers/auth/AuthContext";
import { apiMessage } from "../../../shared/i18n/api-message";
import { toast } from "sonner";
import { Button } from "../../../shared/ui/Button/Button";

const UserPanel = () => {
    const { user, logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    if (!user) {
        return <div>Данные пользователя не получены</div>;
    }

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await toast
                .promise(logout(), {
                    loading: "Выполняется выход...",
                    success: "Вы успешно вышли из системы",
                    error: (err) => apiMessage(err),
                })
                .unwrap();
        } catch {
            // Ошибка уже показана через toast
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <header
            style={{
                marginBottom: "20px",
                paddingBottom: "10px",
                borderBottom: "1px solid #e2e8f0",
            }}
        >
            <span>
                Вы вошли как: <strong>{user.username}</strong>
            </span>

            <Button
                type="button"
                variant="danger"
                onClick={() => void handleLogout()}
                isLoading={isLoggingOut}
            >
                Выйти
            </Button>
        </header>
    );
};

export default UserPanel;
