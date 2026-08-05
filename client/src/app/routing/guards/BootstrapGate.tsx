import { Outlet } from "react-router-dom";
import { useBootstrap } from "../../providers/bootstrap/BootstrapContext";
import { Button } from "../../../shared/ui/Button/Button";


export const BootstrapGate = () => {
    const { state, refreshBootstrap } = useBootstrap();
    if (state.status === 'checking') {
        return <div>Проверяем статус bootstrap...</div>;
    }

    if (state.status === 'error') {
        return (
            <>
                <div>Ошибка при проверке статуса bootstrap</div>
                <Button
                    variant="primary"
                    onClick={refreshBootstrap}
                >
                    Проверить повторно
                </Button>
            </>
        );
    }

    return <Outlet />;
}