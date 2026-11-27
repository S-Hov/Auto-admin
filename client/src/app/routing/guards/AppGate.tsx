import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useBootstrap } from "../../providers/bootstrap/BootstrapContext";
import { Button } from "../../../shared/ui/Button/Button";
import { useAuth } from "../../providers/auth/AuthContext";
import { useAppLocale } from "../locale/use-app-locale";
import { appPaths } from "../app-paths";
import { PageLoader } from '../../../shared/ui/Loader';
import { StatusPanel } from '../../../shared/ui/StatusPanel/StatusPanel';


export const AppGate = () => {
    const { t } = useTranslation('status');
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
            <PageLoader />
        );
    }

    if (state.status === 'error') {
        const btnStyle = {
            flex: 1
        }
        
        return (
            <StatusPanel variant="sad" title={t('bootstrapError')} fullscreen role="alert">
                <Button
                    variant="primary"
                    onClick={refreshBootstrap}
                    style={btnStyle}
                >
                    {t('retry')}
                </Button>
            </StatusPanel>
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
            <StatusPanel variant="repairing" title={t('databaseUnavailable')} fullscreen role="alert">
                <Button
                    variant="primary"
                    onClick={refreshBootstrap}
                >
                    {t('retry')}
                </Button>
            </StatusPanel>
        );
    }

    else if (state.stage === 'system_error') {
        return (
            <StatusPanel variant="sad" title={t('systemError')} fullscreen role="alert">
                <Button
                    variant="primary"
                    onClick={refreshBootstrap}
                >
                    {t('retry')}
                </Button>
            </StatusPanel>
        );
    }

    if (status === 'checking') {
        return <div>Проверяем статус авторизации...</div>;
    }

    else if (status === 'error') {
        return (
            <StatusPanel variant="confused" title={t('authError')} fullscreen role="alert">
                <Button
                    variant="primary"
                    onClick={refreshAuth}
                >
                    {t('retry')}
                </Button>
            </StatusPanel>
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
