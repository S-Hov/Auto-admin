import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useBootstrap } from "../../providers/bootstrap/BootstrapContext";
import { Button } from "../../../shared/ui/Button/Button";


export const BootstrapGate = () => {
    const { state, refreshBootstrap } = useBootstrap();
    const location = useLocation();

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

    if (state.stage === 'database_required' && location.pathname !== '/install') {
        return <Navigate to="/install" replace/>;
    }

    if (state.stage === 'migrations_required' && location.pathname !== '/install/runMigrations') {
        return <Navigate to="/install/runMigrations" replace/>;
    }

    if (state.stage === 'admin_required' && location.pathname !== '/install/register') {
        return <Navigate to="/install/register" replace/>;
    }

    if (state.stage === 'database_unavailable') {
        return (
            <div>
                База данных недоступна.
                <Button
                    variant="primary"
                    onClick={refreshBootstrap}
                >
                    Проверить повторно
                </Button>
            </div>
        );
    }

    else if (state.stage === 'system_error') {
        return (
            <div>
                Произошла системная ошибка.
                <Button
                    variant="primary"
                    onClick={refreshBootstrap}
                >
                    Проверить повторно
                </Button>
            </div>
        );
    }
    
    return <Outlet />;
}