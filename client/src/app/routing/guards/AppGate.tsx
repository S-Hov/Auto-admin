import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useBootstrap } from "../../providers/bootstrap/BootstrapContext";
import { Button } from "../../../shared/ui/Button/Button";
import { useAuth } from "../../providers/auth/AuthContext";
import { useAppLocale } from "../locale/use-app-locale";
import { appPaths } from "../app-paths";


export const AppGate = () => {
    const locale = useAppLocale();
    const paths = {
        home: appPaths.home(locale),
        login: appPaths.login(locale),
        install: appPaths.install(locale),
        runMigrations: appPaths.runMigrations(locale),
        migrationRecovery: appPaths.migrationRecovery(locale),
        registerAdmin: appPaths.registerAdmin(locale),
    }
    const { state, refreshBootstrap } = useBootstrap();
    const location = useLocation();
    const { status, refreshAuth } = useAuth();
    const authRoot = `/${locale}/auth`;
    const installRoot = `/${locale}/install`;

    if (state.status === 'checking') {
        return (
            <div className="loader-container">
                <div className="page-loader"></div>
            </div>
        );
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
        if (location.pathname !== paths.install) {
            return <Navigate to={paths.install} replace />;
        }
        return <Outlet />;
    }

    if (state.stage === 'migrations_required') {
        if (location.pathname !== paths.runMigrations) {
            return <Navigate to={paths.runMigrations} replace />;
        }
        else if (location.pathname === paths.runMigrations) {
            return <Outlet />;
        }
    }

    if (state.stage === 'migration_recovery_required') {
        if (location.pathname !== paths.migrationRecovery) {
            return <Navigate to={paths.migrationRecovery} replace />;
        }
        else if (location.pathname === paths.migrationRecovery) {
            return <Outlet />;
        }
    }

    if (state.stage === 'admin_required') {
        if (location.pathname !== paths.registerAdmin) {
            return <Navigate to={paths.registerAdmin} replace />;
        }
        else if (location.pathname === paths.registerAdmin) {
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

    if (status === 'unauthenticated' && location.pathname !== paths.login) {
        return <Navigate to={paths.login} replace />;
    }

    const isAuthOrInstallPath = location.pathname === authRoot || location.pathname.startsWith(`${authRoot}/`) || location.pathname === installRoot || location.pathname.startsWith(`${installRoot}/`);
    if (status === 'authenticated' && isAuthOrInstallPath) {
        return <Navigate to={paths.home} replace />;
    }

    return <Outlet />;
}
