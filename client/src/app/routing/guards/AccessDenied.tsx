import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { StatusPanel } from '../../../shared/ui/StatusPanel/StatusPanel';
import { appPaths } from '../app-paths';
import { useAppLocale } from '../locale/use-app-locale';

export function AccessDenied() {
    const locale = useAppLocale();
    const { t } = useTranslation('status');

    return (
        <StatusPanel variant="forbidden" title={t('forbidden')} description={t('forbiddenDescription')} role="alert">
            <Link to={appPaths.home(locale)}>{t('home')}</Link>
        </StatusPanel>
    );
}
