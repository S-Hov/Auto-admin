import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useBootstrap } from "../../providers/bootstrap/BootstrapContext";
import { Button } from "../../../shared/ui/Button/Button";
import { useAuth } from "../../providers/auth/AuthContext";


export const AppGate = () => {
    const { state, refreshBootstrap } = useBootstrap();
    const location = useLocation();
    const { status, refreshAuth } = useAuth();

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

    if (state.stage === 'database_required') {
        if (location.pathname !== '/install') {
            return <Navigate to="/install" replace />;
        }
        else if (location.pathname === '/install') {
            return <Outlet />;
        }
    }

    if (state.stage === 'migrations_required') {
        if (location.pathname !== '/install/runMigrations') {
            return <Navigate to="/install/runMigrations" replace />;
        }
        else if (location.pathname === '/install/runMigrations') {
            return <Outlet />;
        }
    }

    if (state.stage === 'migration_recovery_required') {
        return (
            <div>
                Требуется восстановление базы данных (одна из миграций завершилась с ошибкой).
                <Button variant="primary" onClick={refreshBootstrap}>
                    Проверить повторно
                </Button>
            </div>
        );
    }

    if (state.stage === 'admin_required') {
        if (location.pathname !== '/install/register') {
            return <Navigate to="/install/register" replace />;
        }
        else if (location.pathname === '/install/register') {
            return <Outlet />;
        }
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

    if (status === 'checking') {
        return <div>Проверяем статус авторизации...</div>;
    }

    else if (status === 'error') {
        return (
            <div>
                Произошла ошибка при проверке авторизации.
                <Button
                    variant="primary"
                    onClick={refreshAuth}
                >
                    Проверить повторно
                </Button>
            </div>
        );
    }

    if (status === 'unauthenticated' && location.pathname !== '/auth/login') {
        return <Navigate to="/auth/login" replace />;
    }

    const isAuthOrInstallPath = location.pathname.startsWith('/auth/') || location.pathname.startsWith('/install/') || location.pathname === '/auth' || location.pathname === '/install';
    if (status === 'authenticated' && isAuthOrInstallPath) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}